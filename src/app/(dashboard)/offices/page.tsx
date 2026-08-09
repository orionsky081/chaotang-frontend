'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, Archive, ChevronRight, Cross, GraduationCap, RadioTower, Shield, Sparkles } from 'lucide-react';
import { assetUrl } from '@/lib/asset';

type OfficeCode = 'guard' | 'physician' | 'observatory' | 'hanlin';

type Office = {
  code: OfficeCode;
  name: string;
  english: string;
  href: string;
  accent: string;
  icon: typeof Shield;
  portrait: string;
  scene: string;
  mission: string;
  outputs: string[];
  signals: Array<{ label: string; value: string; tone: string }>;
};

const OFFICES: Office[] = [
  {
    code: 'guard',
    name: '锦衣卫',
    english: 'Imperial Guard',
    href: '/intel',
    accent: '#FB923C',
    icon: Shield,
    portrait: '/heroes/character-roster/v5-intel-qi-jiguang.webp',
    scene: '/assets/jinyiwei/scene-full.webp',
    mission: '采证、反证、竞品、外部信号与事实来源核验。未核验，不入圣旨。',
    outputs: ['情报源流图', '证据核验簿', '竞品风险简报', '外部信号预警'],
    signals: [
      { label: '待核信号', value: '23', tone: '#FB923C' },
      { label: '高危', value: '4', tone: '#F43F5E' },
      { label: '可入旨', value: '12', tone: '#3DD68C' },
    ],
  },
  {
    code: 'physician',
    name: '太医院',
    english: 'System Physician',
    href: '/health',
    accent: '#2DD4BF',
    icon: Cross,
    portrait: '/heroes/character-roster/health-li-shizhen.webp',
    scene: '/assets/taiyi/scene-full.webp',
    mission: '诊断系统健康、质量波动、链路异常与运行风险，先验脉象再开方。',
    outputs: ['系统脉案', '质量诊断录', '调养处方', '退化预警'],
    signals: [
      { label: '健康度', value: '87%', tone: '#3DD68C' },
      { label: '异常链路', value: '3', tone: '#F5A524' },
      { label: '已修复', value: '9', tone: '#2DD4BF' },
    ],
  },
  {
    code: 'observatory',
    name: '钦天监',
    english: 'Forecast Office',
    href: '/forecast',
    accent: '#7EC8E3',
    icon: RadioTower,
    portrait: '/heroes/character-roster/forecast-zhang-heng.webp',
    scene: '/assets/qintianjian/qintianjian-bg.webp',
    mission: '推演时机、风险、大势和反事实，让老板先看未来再下旨。',
    outputs: ['趋势推演', '反事实沙盘', '时机判断', '风险星图'],
    signals: [
      { label: '推演中', value: '6', tone: '#7EC8E3' },
      { label: '需复核', value: '2', tone: '#F5A524' },
      { label: '可建议', value: '5', tone: '#3DD68C' },
    ],
  },
  {
    code: 'hanlin',
    name: '翰林院',
    english: 'Skill Forge',
    href: '/hanlin',
    accent: '#F0C66A',
    icon: GraduationCap,
    portrait: '/heroes/character-roster/hanlin-su-shi.webp',
    scene: '/assets/hanlinyuan/hanlinyuan-bg.webp',
    mission: '把外部前沿、视频、案例和方法炼成可复用 Skill，采证、学习、评测、入史。',
    outputs: ['Skill 炼制', '案例拆解', '评测记录', '方法入史'],
    signals: [
      { label: '炼制中', value: '8', tone: '#F0C66A' },
      { label: '待评测', value: '3', tone: '#7EC8E3' },
      { label: '已入史', value: '14', tone: '#3DD68C' },
    ],
  },
];

function panelBackground(accent: string, selected = false) {
  return [
    `radial-gradient(circle at 18% 0%, ${accent}${selected ? '28' : '16'}, transparent 58%)`,
    'linear-gradient(180deg, rgba(240,198,106,0.075), transparent 34%)',
    'linear-gradient(180deg, rgba(21,18,10,0.96), rgba(7,8,14,0.98))',
  ].join(', ');
}

export default function OfficesPage() {
  const [selectedCode, setSelectedCode] = useState<OfficeCode>('guard');
  const selected = useMemo(
    () => OFFICES.find((office) => office.code === selectedCode) ?? OFFICES[0],
    [selectedCode],
  );
  const Icon = selected.icon;

  return (
    <main className="relative h-full overflow-hidden bg-[#05070d] text-[#EAEEFB]">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 scale-[1.03] bg-cover bg-center opacity-[0.52] contrast-[1.08] saturate-[0.95]"
          style={{ backgroundImage: `url(${assetUrl(selected.scene)})` }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(72%_56%_at_50%_34%,rgba(240,198,106,0.13),rgba(4,7,13,0.30)_42%,rgba(2,4,9,0.92)_100%)]" />
        <div className="absolute inset-y-0 left-0 w-[25rem] bg-gradient-to-r from-[#02040a]/95 to-transparent" />
        <div className="absolute inset-y-0 right-0 w-[25rem] bg-gradient-to-l from-[#02040a]/95 to-transparent" />
      </div>

      <div className="relative mx-auto flex h-full max-w-[1440px] flex-col gap-4 p-4 lg:p-5">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#F0C66A]/15 bg-[#070A10]/72 px-5 py-3.5 backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.28em] text-[#8F835F]">COURT OFFICES · SPECIAL BUREAUS</span>
              <span className="rounded border border-[#F0C66A]/30 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-[#F0C66A]">独立诸司</span>
            </div>
            <h1 className="mt-1 font-serif text-[24px] font-semibold tracking-[0.04em] text-[#F5E9C9] md:text-[28px]">
              诸司大厅
            </h1>
            <p className="mt-1 text-[12px] leading-6 text-[#9AA3C4]">
              不再藏在下拉菜单里。锦衣卫、太医院、钦天监、翰林院各自作为独立 AI 办公署进入。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/departments"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#F0C66A]/25 bg-[#F0C66A]/[0.07] px-3.5 py-2 text-[12px] text-[#F0C66A] transition hover:bg-[#F0C66A]/12"
            >
              六部大厅
              <ChevronRight size={13} />
            </Link>
            <Link
              href="/court-briefing"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[12px] text-[#C6CEE6] transition hover:border-[#F0C66A]/30 hover:text-[#F0C66A]"
            >
              上书房
            </Link>
          </div>
        </header>

        <div className="grid flex-1 gap-4 overflow-hidden xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside data-three-axis-panel="left" className="min-h-0 space-y-2 overflow-y-auto pb-3">
            <div className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[#6A7299]">
              诸司署 · 点击选择
            </div>
            {OFFICES.map((office) => {
              const OfficeIcon = office.icon;
              const selectedOffice = office.code === selected.code;
              const itemClassName =
                'group relative block w-full overflow-hidden rounded-xl border px-3.5 py-3 text-left shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-all hover:-translate-y-0.5';
              const itemStyle = {
                borderColor: selectedOffice ? `${office.accent}88` : `${office.accent}3d`,
                background: panelBackground(office.accent, selectedOffice),
                boxShadow: selectedOffice ? `0 0 0 1px ${office.accent}22, 0 0 26px ${office.accent}18, 0 18px 44px rgba(0,0,0,0.52)` : undefined,
              };
              const itemContent = (
                <>
                  <span aria-hidden className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${office.accent}aa, transparent)` }} />
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border" style={{ borderColor: `${office.accent}55`, color: office.accent, background: `${office.accent}10` }}>
                      <OfficeIcon size={16} strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-[#F5E9C9]">{office.name}</span>
                      <span className="mt-0.5 block text-[10px] text-[#6A7299]">{office.english}</span>
                      <span className="mt-1 line-clamp-2 block text-[10px] leading-4 text-[#9AA3C4]">{office.mission}</span>
                    </span>
                    <ChevronRight size={13} className={selectedOffice ? 'text-[#F0C66A]' : 'text-[#3F466A] group-hover:text-[#8A92AC]'} />
                  </div>
                </>
              );
              if (office.code === 'guard') {
                return (
                  <Link
                    key={office.code}
                    href={office.href}
                    data-three-axis-panel-item
                    className={itemClassName}
                    style={itemStyle}
                  >
                    {itemContent}
                  </Link>
                );
              }
              return (
                <button
                  key={office.code}
                  type="button"
                  onClick={() => setSelectedCode(office.code)}
                  data-three-axis-panel-item
                  className={itemClassName}
                  style={itemStyle}
                >
                  {itemContent}
                </button>
              );
            })}
          </aside>

          <section className="min-h-0 overflow-hidden rounded-xl border border-[#F0C66A]/18 bg-[#070A10]/76 backdrop-blur-xl">
            <div className="grid h-full min-h-0 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div data-three-axis-scroll className="relative min-h-0 overflow-hidden p-5">
                <div aria-hidden className="absolute inset-0 opacity-35" style={{ backgroundImage: `url(${assetUrl(selected.scene)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div className="absolute inset-0 bg-gradient-to-r from-[#070A10]/94 via-[#070A10]/72 to-[#070A10]/50" />
                <div className="relative z-10 flex h-full min-h-0 flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em]" style={{ color: selected.accent }}>
                        <Icon size={14} />
                        {selected.english}
                      </div>
                      <h2 className="mt-2 font-serif text-[34px] font-black tracking-[0.06em] text-[#F5E9C9]">
                        {selected.name}
                      </h2>
                      <p className="mt-3 max-w-[760px] text-[13px] leading-7 text-[#C6BB9D]">
                        {selected.mission}
                      </p>
                    </div>
                    <Link
                      href={selected.href}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[12px] font-semibold transition hover:brightness-110"
                      style={{ borderColor: `${selected.accent}44`, color: selected.accent, background: `${selected.accent}10` }}
                    >
                      进入本署
                      <ChevronRight size={13} />
                    </Link>
                  </div>

                  <div className="mt-6 grid gap-3 md:grid-cols-3">
                    {selected.signals.map((signal) => (
                      <div key={signal.label} className="rounded-lg border bg-black/24 px-4 py-3" style={{ borderColor: `${signal.tone}33` }}>
                        <div className="text-[10px] uppercase tracking-[0.16em] text-[#8A92AC]">{signal.label}</div>
                        <div className="mt-1 font-mono text-[24px] font-semibold" style={{ color: signal.tone }}>{signal.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 grid flex-1 gap-3 md:grid-cols-2">
                    {selected.outputs.map((output, index) => (
                      <div key={output} className="rounded-lg border border-white/[0.08] bg-white/[0.035] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[13px] font-semibold text-[#EAEEFB]">{output}</span>
                          <span className="font-mono text-[10px]" style={{ color: selected.accent }}>0{index + 1}</span>
                        </div>
                        <p className="mt-2 text-[11px] leading-5 text-[#8A92AC]">
                          进入本署后展开具体任务池、证据链、负责人汇报和下一步动作。
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <aside data-three-axis-panel="right" className="hidden min-h-0 border-l border-[#F0C66A]/12 bg-black/20 p-5 lg:block">
                <div className="relative h-full overflow-hidden rounded-xl border border-white/[0.08] bg-[#05070D]/70">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={assetUrl(selected.portrait)} alt="" className="h-full w-full object-cover opacity-88" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#05070D] via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.20em]" style={{ color: selected.accent }}>
                      <Sparkles size={13} />
                      Office Agent
                    </div>
                    <div className="mt-1 font-serif text-[22px] font-black text-[#F5E9C9]">{selected.name}负责人</div>
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-[#C6BB9D]">
                      <Activity size={13} style={{ color: selected.accent }} />
                      待命 · 可汇报 · 可派工
                    </div>
                    <div className="mt-4 space-y-2">
                      {[
                        ['主管汇报', selected.mission],
                        ['本署产出', selected.outputs.slice(0, 2).join(' · ')],
                        ['验收口', '任务池、证据链、负责人和下一步动作齐备才可入旨。'],
                      ].map(([label, body]) => (
                        <div
                          key={label}
                          data-three-axis-panel-item
                          className="rounded-lg border px-3 py-2"
                          style={{ borderColor: `${selected.accent}24`, background: 'rgba(5,7,13,0.58)' }}
                        >
                          <div className="text-[10px] font-semibold tracking-[0.12em]" style={{ color: selected.accent }}>{label}</div>
                          <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#B6AB8C]">{body}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </section>
        </div>

        <footer className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-black/24 px-4 py-2 text-[11px] text-[#8A92AC]">
          <span>诸司与六部同级进入：不再下拉，不再隐藏关键办公室。</span>
          <Link href="/archive" className="inline-flex items-center gap-1.5 text-[#F0C66A]">
            <Archive size={12} />
            入史馆查看旧案
          </Link>
        </footer>
      </div>
    </main>
  );
}
