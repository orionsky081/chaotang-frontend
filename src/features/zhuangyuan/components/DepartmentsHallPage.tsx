'use client';

import Link from 'next/link';
import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';

import { ThreeAxisOfficeRails } from '@/components/chaotang/department/ThreeAxisOfficeRails';
import { MINISTRIES } from '@/features/zhuangyuan/components/manorData';
import MinistryMetricsCard, {
  type MinistryCardMetric,
} from '@/features/zhuangyuan/components/ministry-metrics-card';
import { useMinistryMetrics } from '@/features/zhuangyuan/hooks/use-ministry-metrics';
import { isMinistryLive, MINISTRY_TO_DEPT_CODE } from '@/features/zhuangyuan/lib/department-vitrine';
import { assetUrl } from '@/lib/asset';
import type { ManorMinistryMetricsMap } from '@/lib/contracts/manor';

const CANVAS_W = 1672;
const CANVAS_H = 941;
const TOP_CROP = 52;

/** 把后端指标映射成六部指标卡可消费的富结构（deltaText + deltaPositive，保留诚实来源）。 */
function buildCardMetrics(metricsMap: ManorMinistryMetricsMap): Record<string, MinistryCardMetric[]> {
  const out: Record<string, MinistryCardMetric[]> = {};
  for (const ministry of MINISTRIES) {
    const rows = metricsMap[ministry.key];
    if (!rows || rows.length === 0) {
      out[ministry.key] = [];
      continue;
    }
    out[ministry.key] = rows.map((row) => ({
      label: row.label,
      value: row.value,
      deltaText: row.delta,
      deltaPositive: row.deltaPositive,
    }));
  }
  return out;
}

export default function DepartmentsHallPage() {
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const { data: metricsMap } = useMinistryMetrics();

  const cardMetrics: Record<string, MinistryCardMetric[]> = useMemo(
    () => (metricsMap ? buildCardMetrics(metricsMap) : {}),
    [metricsMap],
  );

  const selectedMinistry = selectedKey
    ? (MINISTRIES.find((ministry) => ministry.key === selectedKey) ?? null)
    : null;

  const activeDeptCode = selectedKey
    ? (MINISTRY_TO_DEPT_CODE[selectedKey] ?? 'manors')
    : 'manors';

  const activeDeptLabel = selectedMinistry
    ? selectedMinistry.title.split('·')[0].trim()
    : '六部';

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const parent = stage?.parentElement;
    if (!stage || !parent) return;

    const update = () => {
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      if (width > 0 && height > 0) {
        setScale(Math.max(width / CANVAS_W, height / (CANVAS_H - TOP_CROP)));
      }
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={sceneRef} className="h-full w-full overflow-hidden" style={{ background: '#04060e' }}>
      <div className="relative h-full flex-1 overflow-hidden">
        {selectedKey && (
          <ThreeAxisOfficeRails
            key={activeDeptCode}
            deptCode={activeDeptCode}
            deptLabel={activeDeptLabel}
            accent={selectedMinistry?.color}
          />
        )}

        {/* 底部：顾问卡 + 展开辅政（浮在场景底部） */}
        <SceneBottomBar sceneRef={sceneRef} />

        <div
          ref={stageRef}
          style={{
            position: 'absolute',
            left: '50%',
            top: -TOP_CROP * scale,
            width: CANVAS_W,
            height: CANVAS_H,
            transform: `translateX(-50%) scale(${scale})`,
            transformOrigin: 'top center',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={assetUrl('/assets/zhuangyuan/04-zhuangyuan-new.webp')}
            alt=""
            draggable={false}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              display: 'block',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />

          {/* 古城夜景 → 金色发光路网叠层 + 暗角（设计稿对齐） */}
          <div
            aria-hidden="true"
            className="pointer-events-none"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              background:
                'radial-gradient(circle at 50% 44%, rgba(240,198,106,0.14), transparent 58%), radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(4,6,14,0.62) 100%)',
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage:
                  'linear-gradient(90deg, rgba(240,198,106,0.10) 1px, transparent 1px), linear-gradient(0deg, rgba(240,198,106,0.08) 1px, transparent 1px)',
                backgroundSize: '132px 132px',
                maskImage: 'radial-gradient(circle at 50% 46%, rgba(0,0,0,0.55), transparent 72%)',
                WebkitMaskImage:
                  'radial-gradient(circle at 50% 46%, rgba(0,0,0,0.55), transparent 72%)',
              }}
            />
          </div>

          {MINISTRIES.map((ministry, index) => (
            <MinistryMetricsCard
              key={ministry.key}
              keyName={ministry.key}
              title={ministry.title}
              mark={ministry.mark}
              color={ministry.color}
              metrics={cardMetrics[ministry.key] ?? []}
              box={ministry.box}
              selected={selectedKey === ministry.key}
              enterDelayMs={120 + index * 80}
              markHref={ministry.href}
              live={isMinistryLive(ministry.key)}
              onClick={() => {
                setSelectedKey((prev) => (prev === ministry.key ? null : ministry.key));
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** 底部：左右「问丞相 / 问钦天监」顾问卡 + 中央「展开辅政」胶囊，浮在场景底部。 */
function SceneBottomBar({
  sceneRef,
}: {
  sceneRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[42] flex items-end justify-between px-6 md:px-8">
      <Link
        href="/court-briefing"
        className="advisor-card pointer-events-auto flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 transition"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#F0C66A]/45 bg-[#F0C66A]/10 font-serif text-[12px] font-bold text-[#F0C66A]">
          问
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-[11px] font-medium text-[#F5E9C9]">问丞相</span>
          <span className="text-[10px] text-[#8A9BB8]">先压判断与缺证</span>
        </span>
      </Link>

      {/* 展开辅政胶囊 */}
      <button
        type="button"
        onClick={() => {
          if (sceneRef.current) {
            sceneRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        className="pointer-events-auto hidden rounded-full border border-[#F0C66A]/45 bg-[#04060E]/80 px-6 py-2 font-serif text-[13px] font-semibold tracking-[0.12em] text-[#F0C66A] backdrop-blur-md transition hover:border-[#F0C66A]/80 hover:text-[#F5E9C9] md:inline-block"
      >
        展开辅政
      </button>

      <Link
        href="/forecast"
        className="advisor-card pointer-events-auto flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 transition"
      >
        <span className="flex flex-col items-end leading-tight">
          <span className="text-[11px] font-medium text-[#F5E9C9]">问钦天监</span>
          <span className="text-[10px] text-[#8A9BB8]">先看时机与风险</span>
        </span>
      </Link>
    </div>
  );
}

