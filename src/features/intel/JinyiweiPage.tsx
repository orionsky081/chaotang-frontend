'use client';

import { useMemo, useState } from 'react';
import { FileSearch, Link2, MapPin, RadioTower, RotateCcw, Send, ShieldCheck } from 'lucide-react';

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

const DEPARTMENTS: Record<IntelDepartmentCode, { label: string; color: string; desc: string }> = {
  hu_bu: { label: '户部', color: '#F0C66A', desc: '财务、资本、估值、成本、预算、投资' },
  bing_bu: { label: '兵部', color: '#F43F5E', desc: '竞争、客户、渠道、海外扩张、销售机会' },
  li_bu: { label: '吏部', color: '#9AA3C4', desc: '组织、人才、招聘、激励、管理团队变化' },
  li_bu_rites: { label: '礼部', color: '#C084FC', desc: '品牌、舆情、传播、客户关系、公共形象' },
  xing_bu: { label: '刑部', color: '#F5A524', desc: '法律、合规、监管、合同、诉讼、制裁' },
  gong_bu: { label: '工部', color: '#3DD68C', desc: '研发、供应链、产能、技术、产品迭代' },
  jinyiwei: { label: '锦衣卫', color: '#E0553A', desc: '情报、侦缉、暗访' },
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

  // 按部门统计数量
  const deptCounts = useMemo(() => {
    const counts: Record<string, number> = { all: signals.length };
    for (const signal of signals) {
      counts[signal.departmentCode] = (counts[signal.departmentCode] ?? 0) + 1;
    }
    return counts;
  }, [signals]);

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
            <main className="relative z-10 mx-auto w-full max-w-[1600px] space-y-3 px-4 py-4">
              {/* 顶部统计条 */}
              <header className="rounded-xl border border-[#E0553A]/25 bg-[#05070D]/82 px-5 py-3 backdrop-blur-xl">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="section-eyebrow text-[#E0553A]">JINYIWEI · BACKEND INTEL BOARD</div>
                    <h1 className="mt-1 font-serif text-[22px] font-black text-[#F5E9C9]">六部公开情报巡察台</h1>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <StatsChip label="今日情报总数" value={String(board.stats.total)} color="#F0C66A" />
                    <StatsChip label="全球情报雷达" value={`${signals.length}个情报点`} color="#60A5FA" />
                    <StatsChip label="威胁等级" value="中级" color="#F5A524" />
                    <StatsChip label="情报任务值" value={String(board.stats.urgent)} color="#F43F5E" />
                  </div>
                </div>
                {/* 黄色提示条 */}
                <div className="mt-2 rounded-lg border border-[#F5A524]/25 bg-[#F5A524]/8 px-3 py-1.5 text-[10px] text-[#F5C56B]">
                  当前情报主库不可用或为空，页面显示兜底样例；兜底样例不得进入正式六部测算。
                </div>
              </header>

              {/* 三栏布局：左筛选 | 中地图+队列 | 右详情 */}
              <div className="grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)_320px]">
                {/* 左栏：筛选与监察 */}
                <GlassPanel accent="#E0553A" className="h-fit">
                  <div className="flex items-center justify-between px-4 pt-4">
                    <div className="section-eyebrow">筛选与监察</div>
                    <button
                      type="button"
                      onClick={() => { setDepartment('all'); setLevel('all'); }}
                      className="inline-flex items-center gap-1 text-[10px] text-[#E0553A]"
                    >
                      <RotateCcw size={11} /> 重置
                    </button>
                  </div>
                  <div className="space-y-4 p-4">
                    <div>
                      <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-[#8F835F]">按六部筛选</div>
                      <div className="space-y-1">
                        <DeptFilterRow active={department === 'all'} label="全部" count={deptCounts.all ?? 0} desc="六部情报总览" color="#F0C66A" onClick={() => setDepartment('all')} />
                        {(Object.entries(DEPARTMENTS) as Array<[IntelDepartmentCode, { label: string; color: string; desc: string }]>)
                          .filter(([code]) => code !== 'jinyiwei')
                          .map(([code, meta]) => (
                            <DeptFilterRow key={code} active={department === code} label={meta.label} count={deptCounts[code] ?? 0} desc={meta.desc} color={meta.color} onClick={() => setDepartment(code)} />
                          ))}
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-[#8F835F]">按等级筛选</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <FilterButton active={level === 'all'} label="全部" onClick={() => setLevel('all')} />
                        {(Object.keys(LEVEL_LABEL) as IntelLevel[]).map((item) => (
                          <FilterButton key={item} active={level === item} label={LEVEL_LABEL[item]} onClick={() => setLevel(item)} color={LEVEL_COLOR[item]} />
                        ))}
                      </div>
                    </div>
                  </div>
                </GlassPanel>

                {/* 中栏：地图 + 情报处理队列 */}
                <div className="space-y-3">
                  {/* 全球情报地图 */}
                  <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0A0E1E]">
                    <div className="absolute left-3 top-3 z-10 text-[9px] text-[#6A7299]">真实地图底图·全球公开情报监察</div>
                    <div className="absolute right-3 top-3 z-10 text-[9px] text-[#60A5FA]">{signals.length}个情报点</div>
                    {/* 地图背景 */}
                    <div className="relative h-[280px] w-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={assetUrl('/assets/jinyiwei/world-map.webp')}
                        alt=""
                        className="h-full w-full object-cover opacity-40"
                        onError={(e) => {
                          // 如果地图图片不存在，显示渐变背景
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      {/* 渐变兜底背景 */}
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(96,165,250,0.08),transparent_70%)]" />
                      {/* 情报点 */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative">
                          {signals.slice(0, 8).map((signal, index) => {
                            const angle = (index / Math.min(signals.length, 8)) * Math.PI * 2;
                            const radius = 80 + Math.random() * 40;
                            const x = Math.cos(angle) * radius;
                            const y = Math.sin(angle) * radius;
                            return (
                              <button
                                key={signal.id}
                                type="button"
                                onClick={() => selectSignal(signal.id)}
                                className="absolute flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] transition hover:scale-110"
                                style={{
                                  left: `calc(50% + ${x}px)`,
                                  top: `calc(50% + ${y}px)`,
                                  transform: 'translate(-50%, -50%)',
                                  borderColor: `${LEVEL_COLOR[signal.level]}60`,
                                  background: `${LEVEL_COLOR[signal.level]}15`,
                                  color: LEVEL_COLOR[signal.level],
                                }}
                              >
                                <MapPin size={10} />
                                {signal.title.slice(0, 8)}…
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 情报处理队列 */}
                  <div className="rounded-xl border border-white/10 bg-[#0A0E1E]/80 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-[11px] font-semibold text-[#F5E9C9]">情报处理队列</div>
                      <span className="text-[10px] text-[#6A7299]">{visible.length}条</span>
                    </div>
                    <div className="max-h-[300px] space-y-1.5 overflow-y-auto">
                      {visible.length === 0 ? (
                        <div className="py-8 text-center text-[11px] text-[#8A92AC]">后端没有符合当前筛选的真实情报。</div>
                      ) : visible.map((signal) => (
                        <SignalRow key={signal.id} signal={signal} selected={signal.id === selected?.id} onClick={() => selectSignal(signal.id)} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* 右栏：情报详情 */}
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

/** 顶部统计芯片 */
function StatsChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-1.5">
      <div className="text-[9px] uppercase tracking-[0.12em] text-[#6A7299]">{label}</div>
      <div className="mt-0.5 font-mono text-[14px] font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

/** 左栏部门筛选行 */
function DeptFilterRow({ active, label, count, desc, color, onClick }: { active: boolean; label: string; count: number; desc: string; color: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-[11px] transition"
      style={{
        borderColor: active ? `${color}60` : 'rgba(255,255,255,.06)',
        background: active ? `${color}10` : 'transparent',
      }}
    >
      <div>
        <span className="font-semibold" style={{ color: active ? color : '#EAEEFB' }}>{label}</span>
        <span className="ml-1 text-[9px] text-[#6A7299]">{desc}</span>
      </div>
      <span className="font-mono text-[12px] font-bold" style={{ color: active ? color : '#8A92AC' }}>{count}</span>
    </button>
  );
}

function FilterButton({ active, label, onClick, color = '#F0C66A' }: { active: boolean; label: string; onClick: () => void; color?: string }) {
  return <button type="button" onClick={onClick} className="rounded-md border px-2 py-1.5 text-[11px]" style={{ borderColor: active ? `${color}88` : 'rgba(255,255,255,.08)', background: active ? `${color}14` : 'transparent', color: active ? color : '#9AA3C4' }}>{label}</button>;
}

function SignalRow({ signal, selected, onClick }: { signal: IntelBoardSignal; selected: boolean; onClick: () => void }) {
  const department = DEPARTMENTS[signal.departmentCode];
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition hover:bg-white/[0.04]" style={{ borderColor: selected ? `${department.color}60` : 'rgba(255,255,255,.06)', background: selected ? `${department.color}08` : 'transparent' }}>
      <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold" style={{ background: `${LEVEL_COLOR[signal.level]}20`, color: LEVEL_COLOR[signal.level] }}>{LEVEL_LABEL[signal.level]}</span>
      <span className="min-w-0 flex-1 truncate text-[12px] text-[#EAEEFB]">{signal.title}</span>
      <span className="shrink-0 text-[9px] text-[#6A7299]">{department.label}</span>
    </button>
  );
}

function SignalDetail({ signal, onRoute }: { signal: IntelBoardSignal | null; onRoute: () => void }) {
  if (!signal) return (
    <div className="rounded-xl border border-dashed border-white/10 bg-[#0A0E1E]/60 px-5 py-16 text-center text-[12px] text-[#8A92AC]">
      请选择一条后端情报。
    </div>
  );
  const department = DEPARTMENTS[signal.departmentCode];
  return (
    <GlassPanel accent={department.color} className="h-fit">
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="section-eyebrow">情报详情</div>
            <h2 className="mt-1 font-serif text-[16px] font-bold text-[#F5E9C9]">{signal.title}</h2>
          </div>
          <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px]" style={{ borderColor: `${department.color}40`, color: department.color }}>{department.label}</span>
        </div>
        {/* 基础信息 2x2 */}
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/8 bg-black/20 p-3 text-[11px]">
          <div><span className="text-[#6A7299]">地区：</span><span className="text-[#BFC7DD]">{signal.sources[0]?.name ?? '未知'}</span></div>
          <div><span className="text-[#6A7299]">等级：</span><span style={{ color: LEVEL_COLOR[signal.level] }}>{LEVEL_LABEL[signal.level]}</span></div>
          <div><span className="text-[#6A7299]">来源：</span><span className="text-[#BFC7DD]">{signal.sourceGrade === 'real' ? '公开源' : '演示来源'}</span></div>
          <div><span className="text-[#6A7299]">状态：</span><span className="text-[#BFC7DD]">{STATUS_LABEL[signal.processStatus]}</span></div>
        </div>
        <Detail icon={FileSearch} title="证据摘要"><p>{signal.summary}</p></Detail>
        <Detail icon={Link2} title="公开来源">
          {signal.sources.length ? signal.sources.map((source, index) => source.url ? <a key={`${source.name}-${index}`} href={source.url} target="_blank" rel="noreferrer" className="block break-all text-[#60A5FA] hover:text-[#F0C66A]">{source.name} · {source.url}</a> : <div key={`${source.name}-${index}`}>{source.name} · 无公开地址</div>) : <p className="text-[#F5A524]">当前情报没有公开来源地址，不允许标记为真实来源。</p>}
        </Detail>
        <button type="button" onClick={onRoute} disabled={signal.sourceGrade !== 'real'} className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#E0553A]/45 bg-[#E0553A]/12 px-4 py-2 text-[12px] font-semibold text-[#E0553A] disabled:cursor-not-allowed disabled:opacity-40"><Send size={12} />派发后端六部流程</button>
      </div>
    </GlassPanel>
  );
}

function Detail({ icon: Icon, title, children }: { icon: typeof FileSearch; title: string; children: React.ReactNode }) {
  return <section className="rounded-lg border border-white/8 bg-black/20 p-3"><div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[#8F835F]"><Icon size={12} className="text-[#E0553A]" />{title}</div><div className="space-y-1 text-[11px] leading-5 text-[#BFC7DD]">{children}</div></section>;
}
