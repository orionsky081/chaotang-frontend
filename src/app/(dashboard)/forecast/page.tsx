'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { Clock3, RefreshCw, Server, ShieldCheck, Target, Telescope } from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { PageHeaderShell } from '@/components/PageHeaderShell';
import { API_PATHS, swrFetcher } from '@/lib/api';
import type {
  ForecastBoard,
  ForecastBoardScenario,
  ForecastScenarioName,
} from '@/lib/contracts/forecast-board';
import { assetUrl } from '@/lib/asset';
import { SHANGSHUFANG_ASSETS } from '@/features/shangshufang/constants';

/**
 * 2026-07-23 视觉恢复(批1,轻量方案):09ee238 之前本页有 6 个装饰性"钦天监版面"
 * (古典命理/天文/气象等主题板块,约 2243 行)全部被删,现版是全新写的真实数据页
 * (真 SWR 打后端 ForecastBoard 契约),诚实但视觉朴素。
 *
 * 权衡:全量恢复 6 个装饰板面工作量 ≈ 命令中心那次的 5-10 倍,且大概率是纯装饰、
 * 接不上真后端。这里只加一个"钦天监"立像身份感(复用上书房已在用的同一张 portraitWang
 * 素材),**不复原那 6 个装饰版面、不碰任何真实数据结构**。全量方案见 notes.md。
 */
function QintianIdentityStrip() {
  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
      <div
        className="h-14 w-14 shrink-0 rounded-full border border-[#7EC8E3]/35"
        style={{
          backgroundImage: `url(${assetUrl(SHANGSHUFANG_ASSETS.portraitWang)})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
        }}
        role="img"
        aria-label="钦天监立像"
      />
      <div>
        <div className="text-[10px] tracking-[0.18em] text-[#7EC8E3]">观星导师 · 先知用法</div>
        <div className="mt-0.5 text-[12px] text-white/55">情景概率、风险窗口由后端持久化证据计算，钦天监负责解读呈现</div>
      </div>
    </div>
  );
}

const SCENARIO_LABEL: Record<ForecastScenarioName, string> = {
  optimistic: '上策',
  base: '中策',
  pessimistic: '下策',
};

const SCENARIO_TONE: Record<ForecastScenarioName, string> = {
  optimistic: '#3DD68C',
  base: '#F0C66A',
  pessimistic: '#F43F5E',
};

function formatRatio(value: number): string {
  const normalized = value <= 1 ? value * 100 : value;
  return `${Math.round(normalized)}%`;
}

function ScenarioCard({
  scenario,
  isPrimary,
}: {
  scenario: ForecastBoardScenario;
  isPrimary: boolean;
}) {
  const tone = SCENARIO_TONE[scenario.name];
  return (
    <GlassPanel
      padding="md"
      variant={isPrimary ? 'gold' : 'default'}
      hudCorners={isPrimary}
      className="flex h-full flex-col"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="section-eyebrow" style={{ color: tone }}>
            {SCENARIO_LABEL[scenario.name]} · {scenario.name.toUpperCase()}
          </div>
          <h2 className="mt-2 text-base font-semibold text-[#F5E9C9]">{scenario.label}</h2>
        </div>
        {isPrimary && (
          <span className="rounded-full border border-[#F0C66A]/40 bg-[#F0C66A]/10 px-2.5 py-1 text-[10px] tracking-[0.16em] text-[#F0C66A]">
            主情景
          </span>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
          <div className="text-[10px] tracking-[0.14em] text-white/40">概率</div>
          <div className="mt-1 font-mono text-xl" style={{ color: tone }}>
            {formatRatio(scenario.probability)}
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
          <div className="text-[10px] tracking-[0.14em] text-white/40">置信度</div>
          <div className="mt-1 font-mono text-xl text-[#D8CDAF]">
            {formatRatio(scenario.confidence)}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-white/50">
        <Clock3 className="h-3.5 w-3.5" />
        <span>{scenario.timeframe.start || '—'} 至 {scenario.timeframe.end || '—'}</span>
      </div>

      {scenario.payoffDescription && (
        <p className="body-copy mt-4 line-clamp-3">{scenario.payoffDescription}</p>
      )}

      <div className="mt-auto pt-5">
        <Link
          href={`/forecast/${encodeURIComponent(scenario.id)}`}
          className="text-xs text-[#F0C66A] transition hover:text-[#F5D98B]"
        >
          查看后端证据与触发条件 →
        </Link>
      </div>
    </GlassPanel>
  );
}

export default function ForecastPage() {
  const { data, error, isLoading, mutate } = useSWR<ForecastBoard>(
    API_PATHS.frontend.forecastBoard(50),
    swrFetcher<ForecastBoard>,
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1500px] px-4 py-6 md:px-7">
      <QintianIdentityStrip />
      <PageHeaderShell
        title="观天台 · 钦天监"
        subtitle="情景概率、主情景、风险窗口和下一步均由后端基于持久化证据计算；本页只负责呈现。"
        breadcrumbs={[{ label: '朝堂', href: '/throne' }, { label: '观天台' }]}
        actions={(
          <button
            type="button"
            onClick={() => void mutate()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-md border border-[#F0C66A]/35 bg-[#F0C66A]/10 px-3 py-2 text-xs text-[#F0C66A] transition hover:bg-[#F0C66A]/15 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            刷新后端推演
          </button>
        )}
      />

      {isLoading && !data && (
        <GlassPanel className="flex min-h-72 items-center justify-center" variant="gold">
          <div className="text-center">
            <Telescope className="mx-auto h-8 w-8 animate-pulse text-[#F0C66A]" />
            <p className="mt-3 text-sm text-white/55">正在读取后端推演结果…</p>
          </div>
        </GlassPanel>
      )}

      {error && !data && (
        <GlassPanel className="flex min-h-72 items-center justify-center" variant="danger">
          <div className="max-w-md text-center">
            <p className="text-sm text-[#F5E9C9]">后端预测服务暂不可用</p>
            <p className="mt-2 text-xs leading-6 text-white/45">{error.message}</p>
            <button
              type="button"
              onClick={() => void mutate()}
              className="mt-4 rounded-md border border-white/15 px-3 py-2 text-xs text-white/70"
            >
              重试
            </button>
          </div>
        </GlassPanel>
      )}

      {data && (
        <div className="space-y-5">
          <section className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
            <GlassPanel variant="gold" hudCorners glow>
              <div className="flex items-start gap-4">
                <div className="rounded-lg border border-[#F0C66A]/30 bg-[#F0C66A]/10 p-3">
                  <Target className="h-5 w-5 text-[#F0C66A]" />
                </div>
                <div className="min-w-0">
                  <div className="section-eyebrow">后端裁定 · 当前主情景</div>
                  <div className="mt-2 text-xl font-semibold text-[#F5E9C9]">
                    {data.scenarios.find((item) => item.id === data.primaryScenarioId)?.label ?? '暂无主情景'}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/50">
                    <span>综合置信度 <b className="font-mono text-[#F0C66A]">{data.confidencePct}%</b></span>
                    <span>{data.stats.scenarioCount} 个情景</span>
                    <span>{data.stats.evidenceCount} 条证据</span>
                  </div>
                </div>
              </div>
            </GlassPanel>

            <GlassPanel>
              <div className="flex items-center gap-2 text-xs text-white/50">
                <Server className="h-4 w-4 text-[#6BA0FF]" />
                数据边界
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-[#D8CDAF]">
                <ShieldCheck className="h-4 w-4 text-[#3DD68C]" />
                {data.sourceLabel} · 后端唯一事实源
              </div>
            </GlassPanel>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.scenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                isPrimary={scenario.id === data.primaryScenarioId}
              />
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <GlassPanel variant={data.topRiskWindow ? 'danger' : 'default'}>
              <div className="section-eyebrow">首要风险窗口</div>
              {data.topRiskWindow ? (
                <div className="mt-3">
                  <div className="text-sm font-semibold text-[#F5E9C9]">{data.topRiskWindow.period}</div>
                  <p className="body-copy mt-2">{data.topRiskWindow.opportunity}</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-white/45">后端暂未识别风险窗口。</p>
              )}
            </GlassPanel>

            <GlassPanel variant="success">
              <div className="section-eyebrow">下一步行动</div>
              <p className="mt-3 text-sm leading-7 text-[#E7DDBF]">
                {data.nextAction ?? '后端暂未给出前置行动。'}
              </p>
            </GlassPanel>
          </section>
        </div>
      )}
    </main>
  );
}
