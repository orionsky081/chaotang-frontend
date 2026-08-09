'use client';

import { useMemo, useState } from 'react';
import { FileSearch, Link2, RadioTower, RotateCcw, Send, ShieldCheck } from 'lucide-react';

import { StateSwitch } from '@/components/ui/state-switch';
import { DepartmentPageCanvas, DepartmentStage } from '@/features/departments';
import { GlassPanel } from '@/features/shangshufang/components/atoms';
import { useIntelSignals } from '@/lib/hooks/use-intel-signals';
import { assetUrl } from '@/lib/asset';
import type {
  IntelBoardSignal,
  IntelDepartmentCode,
  IntelLevel,
  IntelProcessStatus,
} from '@/lib/contracts/intel';

import { resolveIntelBoardState } from './lib/resolve-intel-board-state';
import { RouteToTaskDialog } from './components/route-to-task-dialog';

const DEPARTMENTS: Record<IntelDepartmentCode, { label: string; color: string }> = {
  hu_bu: { label: '户部', color: '#F0C66A' },
  bing_bu: { label: '兵部', color: '#F43F5E' },
  li_bu: { label: '吏部', color: '#9AA3C4' },
  li_bu_rites: { label: '礼部', color: '#C084FC' },
  xing_bu: { label: '刑部', color: '#F5A524' },
  gong_bu: { label: '工部', color: '#3DD68C' },
  jinyiwei: { label: '锦衣卫', color: '#E0553A' },
};

const LEVEL_LABEL: Record<IntelLevel, string> = {
  info: '情报',
  watch: '关注',
  warning: '预警',
  critical: '急报',
};

const LEVEL_COLOR: Record<IntelLevel, string> = {
  info: '#60A5FA',
  watch: '#F0C66A',
  warning: '#F5A524',
  critical: '#F43F5E',
};

const STATUS_LABEL: Record<IntelProcessStatus, string> = {
  new: '新发现',
  verified: '待成包',
  packed: '已成包',
  routed: '已派发',
  archived: '已归档',
};

type DepartmentFilter = 'all' | IntelDepartmentCode;

export function JinyiweiPage() {
  const { board, signals, isLoading, isError, mutate } = useIntelSignals();
  const [selectedId, selectSignal] = useState<string | null>(null);
  const [department, setDepartment] = useState<DepartmentFilter>('all');
  const [level, setLevel] = useState<'all' | IntelLevel>('all');
  const [routeOpen, setRouteOpen] = useState(false);

  const state = resolveIntelBoardState({ board, isLoading, isError });

  const visible = useMemo(
    () => signals.filter((signal) =>
      (department === 'all' || signal.departmentCode === department)
      && (level === 'all' || signal.level === level)),
    [department, level, signals],
  );
  const selected = visible.find((signal) => signal.id === selectedId) ?? visible[0] ?? null;
  const headline = board?.headline
    ? signals.find((signal) => signal.id === board.headline?.signalId) ?? null
    : null;

  return (
    <DepartmentPageCanvas
      ariaLabel="锦衣卫公开情报巡察台"
      bgSrc={assetUrl('/assets/jinyiwei/scene-full.webp')}
      bgAlt="锦衣卫情报场景"
      imageClassName="object-cover opacity-20 saturate-[0.8]"
      overlayClassName="bg-[radial-gradient(ellipse_at_50%_10%,rgba(224,85,58,0.10),transparent_45%),linear-gradient(90deg,rgba(2,3,10,0.78),rgba(2,3,10,0.42),rgba(2,3,10,0.78))]"
    >
      <DepartmentStage hasLiveStrip={false} className="overflow-y-auto">
        <StateSwitch state={state} onRetry={mutate} minHeight={520}>
          {(board) => (
            <main className="relative z-10 mx-auto w-full max-w-[1600px] space-y-4 px-4 py-5">
              <header className="rounded-xl border border-[#E0553A]/25 bg-[#05070D]/82 px-5 py-4 backdrop-blur-xl">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="section-eyebrow text-[#E0553A]">JINYIWEI · BACKEND INTEL BOARD</div>
                    <h1 className="mt-1 font-serif text-[24px] font-black text-[#F5E9C9]">六部公开情报巡察台</h1>
                    <p className="mt-2 max-w-3xl text-[12px] leading-6 text-[#B6AB8C]">
                      部门归属、证据状态、来源等级和头条选择均由后端给出；前端只筛选和呈现。
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Metric label="情报" value={board.stats.total} color="#F0C66A" />
                    <Metric label="急报" value={board.stats.urgent} color="#F43F5E" />
                    <Metric label="已核验" value={board.stats.verified} color="#3DD68C" />
                    <Metric label="公开源" value={board.stats.sourceCount} color="#60A5FA" />
                  </div>
                </div>
                <div className="mt-3 font-mono text-[10px] text-[#6A7299]">SOURCE · {board.sourceLabel}</div>
              </header>

              {headline && <HeadlineCard signal={headline} onOpen={() => selectSignal(headline.id)} />}

              <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_360px]">
                <GlassPanel accent="#E0553A" className="h-fit">
                  <div className="flex items-center justify-between px-4 pt-4">
                    <div className="section-eyebrow">展示筛选</div>
                    <button
                      type="button"
                      onClick={() => { setDepartment('all'); setLevel('all'); }}
                      className="inline-flex items-center gap-1 text-[10px] text-[#E0553A]"
                    >
                      <RotateCcw size={11} /> 重置
                    </button>
                  </div>
                  <div className="space-y-4 p-4">
                    <FilterGroup label="部门">
                      <FilterButton active={department === 'all'} label="全部" onClick={() => setDepartment('all')} />
                      {(Object.entries(DEPARTMENTS) as Array<[IntelDepartmentCode, { label: string; color: string }]>).map(([code, meta]) => (
                        <FilterButton key={code} active={department === code} label={meta.label} onClick={() => setDepartment(code)} color={meta.color} />
                      ))}
                    </FilterGroup>
                    <FilterGroup label="等级">
                      <FilterButton active={level === 'all'} label="全部" onClick={() => setLevel('all')} />
                      {(Object.keys(LEVEL_LABEL) as IntelLevel[]).map((item) => (
                        <FilterButton key={item} active={level === item} label={LEVEL_LABEL[item]} onClick={() => setLevel(item)} color={LEVEL_COLOR[item]} />
                      ))}
                    </FilterGroup>
                  </div>
                </GlassPanel>

                <section className="space-y-2">
                  {visible.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/10 px-6 py-16 text-center text-[12px] text-[#8A92AC]">
                      后端没有符合当前筛选的真实情报。
                    </div>
                  ) : visible.map((signal) => (
                    <SignalRow key={signal.id} signal={signal} selected={signal.id === selected?.id} onClick={() => selectSignal(signal.id)} />
                  ))}
                </section>

                <SignalDetail signal={selected} onRoute={() => setRouteOpen(true)} />
              </div>
            </main>
          )}
        </StateSwitch>
      </DepartmentStage>

      <RouteToTaskDialog
        signal={selected}
        dispatchTargets={board?.dispatchTargets ?? []}
        open={routeOpen}
        onClose={() => setRouteOpen(false)}
        onDispatched={() => mutate()}
      />
    </DepartmentPageCanvas>
  );
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="min-w-[78px] rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2">
      <div className="text-[9px] uppercase tracking-[0.16em] text-[#6A7299]">{label}</div>
      <div className="mt-1 font-mono text-[18px] font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

function HeadlineCard({ signal, onOpen }: { signal: IntelBoardSignal; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="w-full rounded-xl border border-[#F0C66A]/30 bg-[#F0C66A]/[0.06] px-5 py-4 text-left">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#F0C66A]">
        <RadioTower size={12} /> 后端今日头条
      </div>
      <div className="mt-2 font-serif text-[19px] font-bold text-[#F5E9C9]">{signal.title}</div>
      <div className="mt-1 text-[12px] leading-6 text-[#B6AB8C]">{signal.summary}</div>
    </button>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return <section><div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-[#8F835F]">{label}</div><div className="grid grid-cols-2 gap-1.5">{children}</div></section>;
}

function FilterButton({ active, label, onClick, color = '#F0C66A' }: { active: boolean; label: string; onClick: () => void; color?: string }) {
  return <button type="button" onClick={onClick} className="rounded-md border px-2 py-1.5 text-[11px]" style={{ borderColor: active ? `${color}88` : 'rgba(255,255,255,.08)', background: active ? `${color}14` : 'transparent', color: active ? color : '#9AA3C4' }}>{label}</button>;
}

function SignalRow({ signal, selected, onClick }: { signal: IntelBoardSignal; selected: boolean; onClick: () => void }) {
  const department = DEPARTMENTS[signal.departmentCode];
  return (
    <button type="button" onClick={onClick} className="w-full rounded-xl border px-4 py-3 text-left transition hover:bg-white/[0.04]" style={{ borderColor: selected ? `${department.color}88` : 'rgba(255,255,255,.08)', background: selected ? `${department.color}10` : 'rgba(5,7,13,.72)' }}>
      <div className="flex items-center justify-between gap-3">
        <span className="font-serif text-[14px] font-bold text-[#EAEEFB]">{signal.title}</span>
        <span className="shrink-0 font-mono text-[10px]" style={{ color: LEVEL_COLOR[signal.level] }}>{LEVEL_LABEL[signal.level]}</span>
      </div>
      <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-[#9AA3C4]">{signal.summary}</p>
      <div className="mt-2 flex flex-wrap gap-2 text-[9px]">
        <span style={{ color: department.color }}>{department.label}</span>
        <span className="text-[#8A92AC]">{STATUS_LABEL[signal.processStatus]}</span>
        <span className={signal.sourceGrade === 'real' ? 'text-[#3DD68C]' : 'text-[#F5A524]'}>{signal.sourceGrade === 'real' ? '公开源已核验' : '来源待核'}</span>
      </div>
    </button>
  );
}

function SignalDetail({ signal, onRoute }: { signal: IntelBoardSignal | null; onRoute: () => void }) {
  if (!signal) return <div className="rounded-xl border border-dashed border-white/10 px-5 py-16 text-center text-[12px] text-[#8A92AC]">请选择一条后端情报。</div>;
  const department = DEPARTMENTS[signal.departmentCode];
  return (
    <GlassPanel accent={department.color} className="h-fit">
      <div className="space-y-4 p-4">
        <div><div className="section-eyebrow">情报详情</div><h2 className="mt-1 font-serif text-[17px] font-bold text-[#F5E9C9]">{signal.title}</h2></div>
        <Detail icon={FileSearch} title="证据摘要"><p>{signal.summary}</p></Detail>
        <Detail icon={Link2} title="公开来源">
          {signal.sources.length ? signal.sources.map((source, index) => source.url ? <a key={`${source.name}-${index}`} href={source.url} target="_blank" rel="noreferrer" className="block break-all text-[#60A5FA] hover:text-[#F0C66A]">{source.name} · {source.url}</a> : <div key={`${source.name}-${index}`}>{source.name} · 无公开地址</div>) : <p className="text-[#F5A524]">后端未返回可审计公开源。</p>}
        </Detail>
        <Detail icon={ShieldCheck} title="后端判定">
          <p>归属：{department.label}</p><p>处理：{STATUS_LABEL[signal.processStatus]}</p><p>来源：{signal.sourceGrade === 'real' ? '公开源已核验' : '仍需补证'}</p>
        </Detail>
        <button type="button" onClick={onRoute} disabled={signal.sourceGrade !== 'real'} className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#E0553A]/45 bg-[#E0553A]/12 px-4 py-2 text-[12px] font-semibold text-[#E0553A] disabled:cursor-not-allowed disabled:opacity-40"><Send size={12} />派发后端六部流程</button>
      </div>
    </GlassPanel>
  );
}

function Detail({ icon: Icon, title, children }: { icon: typeof FileSearch; title: string; children: React.ReactNode }) {
  return <section className="rounded-lg border border-white/8 bg-black/20 p-3"><div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[#8F835F]"><Icon size={12} className="text-[#E0553A]" />{title}</div><div className="space-y-1 text-[11px] leading-5 text-[#BFC7DD]">{children}</div></section>;
}
