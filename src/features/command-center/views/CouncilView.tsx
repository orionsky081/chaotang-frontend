'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { MessagesSquare } from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { CouncilConflictPanel } from '@/features/imperial/grand-council/components/council-conflict-panel';
import { CouncilDiscussionStream } from '@/features/imperial/grand-council/components/council-discussion-stream';
import { CouncilNextActions } from '@/features/imperial/grand-council/components/council-next-actions';
import { CouncilStatusRail } from '@/features/imperial/grand-council/components/council-status-rail';
import { WaitChainPanel } from '@/features/imperial/grand-council/components/wait-chain-panel';
import { API_PATHS, swrFetcher } from '@/lib/api';
import type { CouncilSourceBundle } from '@/lib/contracts/council';

/**
 * 军机处 · 会审室视图
 *
 * 嵌入 /command-center 中，替代旧 /grand-council 独立路由。
 * 冲突、等待链与推进结论均由后端投影；本组件只做显示筛选。
 */
export function CouncilView() {
  const [filter, setFilter] = useState<'all' | 'prime' | 'ministries' | 'risk'>('all');
  const [eventFilter, setEventFilter] = useState<'all' | 'waiting' | 'ready' | 'risk'>('all');
  const [eventDepartment, setEventDepartment] = useState<string>('all');
  const { data: council, error } = useSWR<CouncilSourceBundle, Error>(
    API_PATHS.frontend.council(5),
    swrFetcher<CouncilSourceBundle>,
    { refreshInterval: 30_000, revalidateOnFocus: true },
  );
  const discussions = council?.discussions ?? [];
  const conflicts = council?.conflicts ?? [];
  const actions = council?.actions ?? [];
  const waitChain = council?.waitChain ?? [];
  const statusItems = council?.statusItems ?? [];
  const events = council?.events ?? [];
  const eventDepartments = ['all', ...Array.from(new Set(events.map((event) => event.department)))];
  const filteredEvents = events.filter((event) => {
    const phaseMatch =
      eventFilter === 'all' ? true : eventFilter === 'risk' ? event.tone === 'danger' : event.phase === eventFilter;
    const departmentMatch = eventDepartment === 'all' ? true : event.department === eventDepartment;
    return phaseMatch && departmentMatch;
  });

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[1600px] space-y-6 p-6">
        <GlassPanel variant="gold" tone="elevated" padding="lg" className="overflow-hidden">
          <div className="grid gap-5 xl:grid-cols-[1.55fr_0.95fr] xl:items-start">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#B6AB8C]">Grand Council · 军机处会审室</div>
                {council?.sourceLabel === 'LIVE_SWARM' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#3DD68C]/40 bg-[#3DD68C]/12 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-[#3DD68C]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#3DD68C]" />
                    LIVE · {council.liveRunCount} 条在审执行链
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F0C66A]/45 bg-[#F0C66A]/10 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-[#F0C66A]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#F0C66A]" />
                    {error ? '后端会审读取失败' : '当前无真实在审会审'}
                  </span>
                )}
              </div>
              <h1 className="max-w-[900px] text-[30px] font-semibold leading-tight text-[#F5E9C9]" style={{ fontFamily: 'var(--font-serif)' }}>
                丞相与六部正在这里讨论、会签、争论并收敛结论。
              </h1>
              <p className="body-copy max-w-[780px] text-[14px] leading-8 text-[#B8C0DA]">
                军机处不是聊天页，而是中枢会议室。用户在这里看到的，不是所有执行细节，而是哪些官员在发言、当前争议卡在哪、丞相如何把分歧收敛成可批示的判断。
              </p>
            </div>

            <GlassPanel tone="elevated" padding="md">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#B6AB8C]">当前议题</div>
              {council?.currentCommand ? (
                <>
                  <h2 className="mt-1 text-[18px] font-semibold text-[#F5E9C9]" style={{ fontFamily: 'var(--font-serif)' }}>
                    {council.currentCommand}
                  </h2>
                  <p className="body-copy mt-3 text-[13px] leading-7 text-[#A7B0CC]">
                    {council.currentVerdict || '后端尚未返回合议结论'}
                  </p>
                </>
              ) : (
                <>
                  <h2 className="mt-1 text-[18px] font-semibold text-[#F5E9C9]" style={{ fontFamily: 'var(--font-serif)' }}>
                    当前无真实在审议题
                  </h2>
                  <p className="body-copy mt-3 text-[13px] leading-7 text-[#A7B0CC]">
                    {error
                      ? `无法读取后端会审：${error.message}`
                      : '当前没有真实执行链送入军机处；本页不会用示例会审填充空态。'}
                  </p>
                </>
              )}
            </GlassPanel>
          </div>
        </GlassPanel>

        {statusItems.length > 0 && <CouncilStatusRail items={statusItems} />}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.8fr_1.4fr_0.8fr]">
          <div className="space-y-5">
            <CouncilConflictPanel conflicts={conflicts} />
            <WaitChainPanel steps={waitChain} />
          </div>

          <GlassPanel variant="gold" tone="deep" padding="lg" className="overflow-hidden">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MessagesSquare size={14} className="text-[#F0C66A]" />
                <h2 className="section-title">议事流</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  ['all', '全部'],
                  ['prime', '只看丞相'],
                  ['ministries', '只看六部'],
                  ['risk', '只看风险'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value as typeof filter)}
                    className={`rounded-lg border px-3 py-1 text-[11px] transition ${
                      filter === value
                        ? 'border-[#F0C66A]/35 bg-[#F0C66A]/12 text-[#F0C66A]'
                        : 'border-white/10 text-[#9AA3C4] hover:bg-white/5'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <CouncilDiscussionStream items={discussions} filter={filter} />
            </div>
          </GlassPanel>

          <CouncilNextActions actions={actions} />
        </div>

        <GlassPanel tone="elevated" padding="md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#B6AB8C]">Event Chain</div>
              <h2 className="mt-1 text-[17px] font-semibold text-[#F5E9C9]" style={{ fontFamily: 'var(--font-serif)' }}>军机处事件流</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                ['all', '全部'],
                ['waiting', '等待中'],
                ['ready', '可推进'],
                ['risk', '高风险'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setEventFilter(value as typeof eventFilter)}
                  className={`rounded-lg border px-3 py-1 text-[11px] transition ${
                    eventFilter === value
                      ? 'border-[#F0C66A]/35 bg-[#F0C66A]/12 text-[#F0C66A]'
                      : 'border-white/10 text-[#9AA3C4] hover:bg-white/5'
                  }`}
                >
                  {label}
                </button>
              ))}
              <div className="mx-1 h-6 w-px bg-white/10" />
              {eventDepartments.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setEventDepartment(value)}
                  className={`rounded-lg border px-3 py-1 text-[11px] transition ${
                    eventDepartment === value
                      ? 'border-[#6BA0FF]/35 bg-[#6BA0FF]/12 text-[#6BA0FF]'
                      : 'border-white/10 text-[#9AA3C4] hover:bg-white/5'
                  }`}
                >
                  {value === 'all' ? '全部部门' : value}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredEvents.map((event) => (
              <div key={`${event.time}-${event.title}`} className="rounded-xl border border-white/6 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold text-[#F5E9C9]">{event.title}</div>
                    <div className="mt-1 text-[11px] text-[#6BA0FF]">{event.department}</div>
                  </div>
                  <div className="font-mono text-[11px] text-[#8F835F]">{event.time}</div>
                </div>
                <div className="mt-2 text-[11px] leading-6 text-[#9AA3C4]">{event.body}</div>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
