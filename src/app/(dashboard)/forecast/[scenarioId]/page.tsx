'use client';

import { use } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Calendar, Lightbulb, Target } from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { swrFetcher } from '@/lib/api';
import type {
  ForecastBoardScenario,
  ForecastScenarioName,
} from '@/lib/contracts/forecast-board';

const SCENARIO_COLOR: Record<ForecastScenarioName, string> = {
  optimistic: '#3DD68C',
  base: '#F0C66A',
  pessimistic: '#F43F5E',
};

const SCENARIO_LABEL: Record<ForecastScenarioName, string> = {
  optimistic: '上策',
  base: '中策',
  pessimistic: '下策',
};

function formatRatio(value: number): string {
  return `${Math.round(value <= 1 ? value * 100 : value)}%`;
}

interface PageProps {
  params: Promise<{ scenarioId: string }>;
}

export default function ForecastScenarioDetailPage({ params }: PageProps) {
  const { scenarioId } = use(params);
  const { data: scenario, error, isLoading, mutate } = useSWR<ForecastBoardScenario>(
    `/api/frontend/forecast/scenarios/${encodeURIComponent(scenarioId)}`,
    swrFetcher<ForecastBoardScenario>,
  );

  if (isLoading && !scenario) {
    return (
      <main className="mx-auto max-w-[1100px] p-6">
        <GlassPanel className="flex min-h-72 items-center justify-center" variant="gold">
          <p className="text-sm text-white/50">正在读取后端情景证据…</p>
        </GlassPanel>
      </main>
    );
  }

  if (error || !scenario) {
    return (
      <main className="mx-auto max-w-[1100px] space-y-5 p-6">
        <Link href="/forecast" className="inline-flex items-center gap-2 text-xs text-[#F0C66A]">
          <ArrowLeft className="h-3.5 w-3.5" /> 返回观天台
        </Link>
        <GlassPanel className="flex min-h-64 items-center justify-center" variant="danger">
          <div className="text-center">
            <p className="text-sm text-[#F5E9C9]">后端未返回该情景</p>
            <p className="mt-2 font-mono text-xs text-white/35">{scenarioId}</p>
            <button
              type="button"
              onClick={() => void mutate()}
              className="mt-4 rounded-md border border-white/15 px-3 py-2 text-xs text-white/60"
            >
              重试
            </button>
          </div>
        </GlassPanel>
      </main>
    );
  }

  const color = SCENARIO_COLOR[scenario.name];

  return (
    <main className="mx-auto max-w-[1100px] space-y-5 p-6">
      <Link
        href="/forecast"
        className="inline-flex items-center gap-1.5 text-xs text-white/45 transition hover:text-[#F0C66A]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        返回观天台
      </Link>

      <GlassPanel variant="gold" padding="lg" hudCorners>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="section-eyebrow" style={{ color }}>
              {scenario.name.toUpperCase()} · {SCENARIO_LABEL[scenario.name]}
            </div>
            <h1 className="page-title-plain mt-2 text-[26px]">{scenario.label}</h1>
            <div className="mt-3 flex items-center gap-2 text-xs text-white/40">
              <Calendar className="h-3.5 w-3.5" />
              {scenario.timeframe.start || '—'} 至 {scenario.timeframe.end || '—'}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5 text-right">
            <div>
              <div className="text-[10px] tracking-wider text-white/35">概率</div>
              <div className="mt-1 font-mono text-3xl" style={{ color }}>
                {formatRatio(scenario.probability)}
              </div>
            </div>
            <div>
              <div className="text-[10px] tracking-wider text-white/35">置信度</div>
              <div className="mt-1 font-mono text-3xl text-[#D8CDAF]">
                {formatRatio(scenario.confidence)}
              </div>
            </div>
          </div>
        </div>
        {scenario.payoffDescription && <p className="body-copy mt-5">{scenario.payoffDescription}</p>}
      </GlassPanel>

      <section className="grid gap-5 lg:grid-cols-2">
        <GlassPanel padding="lg">
          <div className="mb-4 flex items-center gap-2">
            <Target className="h-4 w-4 text-[#6BA0FF]" />
            <div className="section-eyebrow">触发条件 · 后端证据</div>
          </div>
          {scenario.triggerConditions.length > 0 ? (
            <ul className="space-y-2">
              {scenario.triggerConditions.map((trigger, index) => (
                <li key={trigger.id ?? `${scenario.id}-trigger-${index}`} className="rounded-md border border-white/10 bg-black/20 p-3">
                  <p className="text-sm text-[#E7DDBF]">{trigger.description}</p>
                  <div className="mt-2 flex justify-between gap-3 text-[10px] text-white/35">
                    <span>{trigger.source || '后端证据'}</span>
                    {typeof trigger.probability === 'number' && <span>{formatRatio(trigger.probability)}</span>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-white/40">后端暂未返回触发条件。</p>
          )}
        </GlassPanel>

        <GlassPanel padding="lg" variant={scenario.riskWindows.length ? 'danger' : 'default'}>
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#F5A524]" />
            <div className="section-eyebrow">风险窗口</div>
          </div>
          {scenario.riskWindows.length > 0 ? (
            <div className="space-y-2">
              {scenario.riskWindows.map((window, index) => (
                <div key={window.id ?? `${scenario.id}-risk-${index}`} className="rounded-md border border-white/10 bg-black/20 p-3">
                  <div className="text-sm font-semibold text-[#F5E9C9]">{window.period}</div>
                  <p className="mt-1 text-xs leading-6 text-white/55">{window.opportunity}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/40">后端暂未返回风险窗口。</p>
          )}
        </GlassPanel>
      </section>

      <GlassPanel padding="lg" variant="success">
        <div className="mb-4 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-[#F0C66A]" />
          <div className="section-eyebrow">前置行动</div>
        </div>
        {scenario.preActions.length > 0 ? (
          <ol className="space-y-2">
            {scenario.preActions.map((action, index) => (
              <li key={`${scenario.id}-action-${index}`} className="flex gap-3 rounded-md border border-white/10 bg-black/20 p-3">
                <span className="font-mono text-xs text-[#F0C66A]">{String(index + 1).padStart(2, '0')}</span>
                <span className="text-sm text-[#E7DDBF]">{action}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-white/40">后端暂未给出前置行动。</p>
        )}
      </GlassPanel>
    </main>
  );
}
