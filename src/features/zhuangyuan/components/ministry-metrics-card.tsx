'use client';

/**
 * MinistryMetricsCard — 六部「悬浮指标卡」（六部大厅视觉重构版）
 *
 * 视觉对齐古风黑金设计稿：深色半透明底 + 金边 + 圆角 12px + 轻微外发光。
 * 卡结构：左上部门名 + 右上状态徽章 + 三行指标（标签 + 数值 + 较昨日增量，增量正绿/负红）。
 *
 * 功能铁律（与旧 DomainCard 等价，须保留）：
 *   - 标志区(card-mark)：独立 Link，点击导航到该部页面(markHref)。
 *   - 卡片主体其余区域：onClick 选中并通知父组件打开部门面板（不导航）。
 * HTML 合法性：外层 div[role=button]，标志区独立 Link + stopPropagation。
 *
 * 数值诚实：live 部门用后端 metrics 渲染；无数据的格显「待接入」；非 live（骨架）一律「待接入」×3。
 */

import Link from 'next/link';
import { useEffect, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';

export interface MinistryCardMetric {
  label: string;
  value: string;
  /** 较昨日增量文本，如 "+12.4%"；可缺省 */
  deltaText?: string;
  /** 增量是否正向（正向绿 / 负向红）；缺省时无法着色则不显增量 */
  deltaPositive?: boolean;
}

export interface MinistryMetricsCardProps {
  keyName?: string;
  title: string;
  mark: ReactNode;
  color: string;
  metrics: MinistryCardMetric[];
  box: { left: number; top: number; width: number; height: number };
  /** 主体区域点击回调(选中 + 打开部门面板,不导航) */
  onClick?: () => void;
  /** 标志区点击导航目标 URL。undefined = 无目标,标志区不可点击 */
  markHref?: string;
  selected?: boolean;
  enterDelayMs?: number;
  /** 是否为「真」部门。true → 金光常驻 + 「真 · LIVE」徽；false → 灰金「待建」+ 「待接入」指标 */
  live?: boolean;
}

const GOLD = '#F0C66A';
const CREAM = '#F5E9C9';
const UP = '#3DD68C';
const DOWN = '#F45A6B';

/** 骨架部门固定展示的占位行（设计稿：待接入 ×3） */
const PLACEHOLDER_ROWS = 3;

function MetricRow({ metric, live }: { metric: MinistryCardMetric; live: boolean }) {
  // 非 live（骨架）一律打码「待接入」——金光对了，数字也不许撒谎（诚实 vitrine）。
  const hasValue = live && !!metric.value && metric.value !== '待接入';
  const delta =
    live && metric.deltaText
      ? metric.deltaText
      : live && typeof metric.deltaPositive === 'boolean'
        ? metric.deltaPositive
          ? '▲'
          : '▼'
        : null;

  return (
    <div className="flex items-baseline justify-between gap-2 text-[11px] leading-[1.35]">
      <span className="shrink-0 truncate text-[#8A9BB8]">{metric.label || ''}</span>
      <span className="flex items-baseline gap-1.5">
        <span
          className="tnum min-w-[44px] text-right tabular-nums font-medium"
          style={{ color: hasValue ? CREAM : '#6f6a58' }}
        >
          {hasValue ? metric.value : '待接入'}
        </span>
        {hasValue && delta !== null ? (
          <span
            className="tnum text-[10px] font-semibold tabular-nums"
            style={{ color: metric.deltaPositive === false ? DOWN : UP }}
          >
            {delta}
          </span>
        ) : null}
      </span>
    </div>
  );
}

export default function MinistryMetricsCard({
  keyName,
  title,
  mark,
  color,
  metrics,
  box,
  onClick,
  markHref,
  selected = false,
  enterDelayMs = 0,
  live = false,
}: MinistryMetricsCardProps) {
  const [pulseIndex, setPulseIndex] = useState(-1);

  useEffect(() => {
    const timer = setInterval(() => {
      const deltaIndices = metrics
        .map((m, i) => (m.value ? i : -1))
        .filter((i) => i >= 0);
      if (deltaIndices.length > 0) {
        const pick = deltaIndices[Math.floor(Math.random() * deltaIndices.length)];
        setPulseIndex(pick);
        setTimeout(() => setPulseIndex(-1), 1200);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [metrics]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  const rows: MinistryCardMetric[] =
    metrics.length > 0
      ? metrics.slice(0, PLACEHOLDER_ROWS)
      : Array.from({ length: PLACEHOLDER_ROWS }, () => ({ label: '', value: '' }));

  const mergedStyle: CSSProperties = {
    position: 'absolute',
    ...box,
    zIndex: selected ? 18 : 15,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 14,
    paddingRight: 14,
    borderRadius: 12,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    overflow: 'hidden',
    textAlign: 'left',
    cursor: 'pointer',
    background:
      'linear-gradient(158deg, rgba(16,21,38,0.82) 0%, rgba(7,10,18,0.78) 100%)',
    backdropFilter: 'blur(3px)',
    border: `1px solid ${GOLD}55`,
    boxShadow: selected
      ? `inset 0 1px 0 rgba(235,203,123,0.25), 0 0 0 1px ${color}, 0 0 38px -6px ${color}cc, 0 22px 50px -18px rgba(0,0,0,0.95)`
      : live
        ? `inset 0 1px 0 rgba(240,198,106,0.22), 0 0 0 1px rgba(240,198,106,0.30), 0 0 30px -8px ${GOLD}66, 0 16px 40px -20px rgba(0,0,0,0.9)`
        : `inset 0 1px 0 rgba(240,198,106,0.10), 0 0 0 1px rgba(240,198,106,0.12), 0 14px 36px -16px rgba(0,0,0,0.9)`,
    transition:
      'transform 0.32s cubic-bezier(0.2,0.7,0.2,1), box-shadow 0.32s ease, border-color 0.32s ease',
    // 骨架部门暗置：重灰度 + 降透明，与金光真部门一眼分开（诚实 vitrine）
    ...(!live ? { filter: 'grayscale(0.55) saturate(0.8)', opacity: 0.86 } : {}),
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      data-manor-key={keyName}
      aria-label={`查看 ${title} 蜂群状态`}
      aria-pressed={selected}
      style={mergedStyle}
    >
      {/* 顶部横线光 */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-3 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${selected ? color : GOLD}99, transparent)`,
          opacity: 0.8,
        }}
      />

      {/* 头部：左 mark + 部门名，右上状态徽章 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {markHref ? (
            <Link
              href={markHref}
              aria-label={`前往 ${title} 部门页面`}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="grid h-[24px] w-[24px] shrink-0 place-items-center rounded-[7px] text-[15px] transition-transform hover:scale-110 focus:outline-none focus-visible:ring-1"
              style={{
                color,
                border: `1px solid ${color}9a`,
                background: `linear-gradient(160deg, ${color}30 0%, ${color}12 60%, transparent 100%)`,
                boxShadow: `inset 0 1px 0 ${color}44, 0 0 12px -2px ${color}77`,
                outlineOffset: 2,
              }}
              title={`前往 ${title}`}
            >
              {mark}
            </Link>
          ) : (
            <span
              aria-hidden="true"
              className="grid h-[24px] w-[24px] shrink-0 place-items-center rounded-[7px] text-[15px]"
              style={{
                color,
                border: `1px solid ${color}9a`,
                background: `linear-gradient(160deg, ${color}30 0%, ${color}12 60%, transparent 100%)`,
                boxShadow: `inset 0 1px 0 ${color}44, 0 0 12px -2px ${color}77`,
                opacity: 0.72,
              }}
            >
              {mark}
            </span>
          )}
          <span className="font-serif text-[14px] font-semibold leading-tight tracking-[0.05em] text-[#F5E9C9]">
            {title}
          </span>
        </div>

        <span
          className="shrink-0 rounded-full px-1.5 py-[1px] text-[9px] font-semibold leading-none"
          style={
            live
              ? { color: GOLD, border: `1px solid ${GOLD}66`, background: `${GOLD}1a` }
              : { color: '#8a8470', border: '1px solid #8a847055', background: '#8a847012' }
          }
        >
          {live ? '真 · LIVE' : '待建'}
        </span>
      </div>

      {/* 指标行 */}
      <div className="mt-[9px] flex flex-col gap-[4px]">
        {rows.map((m, i) => (
          <MetricRow
            key={m.label ? `${m.label}-${i}` : `row-${i}`}
            metric={m}
            live={live}
          />
        ))}
      </div>

      {/* 底部增量脉冲 */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 h-[2px] w-full origin-left"
        style={{
          background: `linear-gradient(90deg, ${UP}, transparent)`,
          opacity: pulseIndex >= 0 ? 0.7 : 0,
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* 底部分隔线 */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: 6,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${color}55, transparent)`,
          opacity: selected ? 1 : 0.45,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
