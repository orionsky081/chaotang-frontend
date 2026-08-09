'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import {
  ArrowLeft,
  ScrollText,
  FileCheck2,
  Landmark,
  BookOpen,
  Scroll,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

import { CeremonialCompose } from '@/features/throne/components/ceremonial-compose';
import { assetUrl } from '@/lib/asset';

/**
 * 拟旨页 · 圣旨卷轴编辑器
 *
 * 上书房式三栏框架：
 *   左栏 · 丞相判断（今日最需处理三件事）
 *   中央 · 圣旨卷轴编辑器（scroll-paper 卷轴 + 拟旨表单）
 *   右栏 · 钦天监指导（教程卡，纯展示文案）
 * 核心的拟旨表单逻辑 / 校验 / 提交 API 全部保留在 CeremonialCompose 中。
 */

const resources = [
  {
    title: '御座',
    subtitle: '圣旨总台主视觉',
    src: assetUrl('/heroes/v4-7-throne.webp'),
  },
  {
    title: '群臣',
    subtitle: '多智能体会审',
    src: assetUrl('/heroes/v4-8-ministers.webp'),
  },
  {
    title: '上书房',
    subtitle: '真实问题入口',
    src: assetUrl('/shangshufang/bg-shangshufang-scene.webp'),
  },
] as const;

/** 朝堂实证 · 自证清单（重组保留，不删除） */
const evidence = [
  { label: 'prod:doctor', value: 'FIX', detail: '真链路未全绿前不宣称完整 LIVE' },
  { label: 'release pages', value: '10/10', detail: 'P0/P1 页面、资源、移动溢出' },
  { label: 'archive', value: 'READY', detail: '战报和证据归史馆' },
] as const;

/** 钦天监指导（纯展示文案） */
const TUTORIALS = [
  {
    icon: BookOpen,
    title: '新罗引导 · 如何使用朝堂 OS',
    steps: [
      '在中央卷轴写下想办成的事',
      '选择办理风格（照本宣科 / 规矩变通 / 随机应变）',
      '点击「下旨」，朝堂自动分派群臣并现场直播',
    ],
  },
  {
    icon: Scroll,
    title: '御令发布 · 如何下旨批示',
    steps: [
      '一句话讲清要务，正文与背景均可',
      '用 ⌘ + Enter 快速发令',
      '下达后到军机处（command-center）查看进度',
    ],
  },
] as const;

export default function ThroneComposePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#04060E] text-[#F5E9C9]">
      <div className="mx-auto max-w-[1560px] px-4 pb-20 pt-6 md:px-8">
        {/* ── 精简营销区：奉天承运 + 一行小标签 ─────────────────────── */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/court-briefing"
            className="inline-flex items-center gap-1.5 text-[12px] text-[#9AA3C4] transition hover:text-[#F0C66A]"
          >
            <ArrowLeft size={13} />
            返回上书房
          </Link>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-[#F0C66A]">
            <ScrollText size={13} />
            奉天承运 · 圣旨总台
          </div>
          <div className="hidden text-[10px] uppercase tracking-[0.28em] text-[#8F98B8] sm:block">
            Imperial Decree · 拟旨
          </div>
        </header>
        <p className="mt-3 text-center text-[12px] text-[#8F98B8]">
          所有要务，先归一道圣旨。在卷轴内写清楚一件事，再下旨交朝堂。
        </p>

        {/* ── 三栏框架：左丞相 · 中央卷轴 · 右钦天监 ───────────────── */}
        <main className="mt-8 grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)_280px]">
          {/* 中央 · 圣旨卷轴编辑器（移动端优先展示） */}
          <section className="order-1 min-w-0 lg:order-2">
            <EdictScroll />

            {/* 资源画廊 · 次级区块（不删除，收在卷轴下方） */}
            <ResourceGallery />
          </section>

          {/* 左栏 · 丞相判断 */}
          <aside className="order-2 lg:order-1">
            <ChancellorRail />
            <EvidenceCard />
          </aside>

          {/* 右栏 · 钦天监指导 */}
          <aside className="order-3">
            <QintianGuide />
          </aside>
        </main>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   中央 · 圣旨卷轴编辑器
   ════════════════════════════════════════════════════════════════════ */

function EdictScroll() {
  return (
    <div className="relative">
      {/* 卷轴杆（上下）+ 四角玉珠装饰 */}
      <RollerRod side="top" />
      <RollerRod side="bottom" />
      <JadeBead corner="tl" />
      <JadeBead corner="tr" />
      <JadeBead corner="bl" />
      <JadeBead corner="br" />

      <div className="scroll-frame">
        <div className="scroll-paper overflow-hidden">
          {/* 顶部：圣旨大标题 + 御览朱印 */}
          <div className="relative flex items-center justify-between px-8 pt-7 md:px-10">
            <div className="display-serif text-[28px] font-bold tracking-[0.32em] text-[#3a2f18] md:text-[34px]">
              圣旨
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-[10px] uppercase tracking-[0.3em] text-[#a08a5a] md:inline">
                奉天承運 · 皇帝詔曰
              </span>
              <ImperialSeal label="御览" />
            </div>
          </div>

          {/* 御前润色回执提示条 */}
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-[#9E2B25]/30 bg-[#9E2B25]/8 px-3 py-2 text-[11px] leading-relaxed text-[#7a2a22] md:mx-10">
            <Sparkles size={12} className="shrink-0" />
            <span>
              <b className="font-semibold">御前润色回执：</b>
              润色后只展示文字预览，不会在卷轴内直接启动跳转。
            </span>
          </div>

          {/* 拟旨大输入框（CeremonialCompose 迁入卷轴内，逻辑原样） */}
          <div className="mt-1 pb-6">
            <CeremonialCompose embedded paper />
          </div>
        </div>
      </div>
    </div>
  );
}

/* 顶部 / 底部卷轴杆（描金铜杆） */
function RollerRod({ side }: { side: 'top' | 'bottom' }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-[3%] right-[3%] z-10"
      style={{ top: side === 'top' ? -9 : undefined, bottom: side === 'bottom' ? -9 : undefined }}
    >
      <div
        className="h-[18px] rounded-full"
        style={{
          background:
            'linear-gradient(180deg,#241a0a 0%,#5a4620 28%,#caa75a 50%,#5a4620 72%,#1f1708 100%)',
          boxShadow:
            side === 'top'
              ? '0 10px 18px rgba(0,0,0,0.5)'
              : '0 -10px 18px rgba(0,0,0,0.5)',
        }}
      />
    </div>
  );
}

/* 四角金色玉珠 */
function JadeBead({ corner }: { corner: 'tl' | 'tr' | 'bl' | 'br' }) {
  const pos: CSSProperties =
    corner === 'tl'
      ? { top: -13, left: -13 }
      : corner === 'tr'
        ? { top: -13, right: -13 }
        : corner === 'bl'
          ? { bottom: -13, left: -13 }
          : { bottom: -13, right: -13 };
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-10 h-8 w-8 rounded-full"
      style={{
        ...pos,
        background:
          'radial-gradient(circle at 38% 32%, #FFE9A8 0%, #F0C66A 42%, #B8893A 80%, #6B4E1E 100%)',
        boxShadow: '0 0 16px rgba(240,198,106,0.5), inset 0 -2px 4px rgba(0,0,0,0.3)',
      }}
    />
  );
}

/* 红色「御览」印章 */
function ImperialSeal({ label }: { label: string }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-[5px] px-2.5 py-1.5"
      style={{
        color: '#FBEAD0',
        background: 'linear-gradient(145deg, #B23B30, #8E211C)',
        border: '2px solid #7C1A16',
        boxShadow: 'inset 0 0 8px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.3)',
        transform: 'rotate(-5deg)',
      }}
    >
      <span className="display-serif text-[13px] font-bold tracking-widest md:text-[15px]">{label}</span>
    </div>
  );
}

/* 资源画廊 · 次级区块（原功能保留） */
function ResourceGallery() {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[#D8C17A]">
        <Landmark size={13} />
        御座群臣 · 资源一览
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {resources.map((item) => (
          <article
            key={item.title}
            className="group overflow-hidden rounded-xl border border-[#F0C66A]/14 bg-white/[0.035]"
          >
            <div className="relative aspect-[16/8]">
              <Image
                src={item.src}
                alt={item.title}
                fill
                unoptimized
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition duration-500 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/62 via-black/10 to-transparent" />
              <div className="absolute bottom-3 left-3">
                <div className="display-serif text-[16px] font-semibold text-[#FFF8E6]">{item.title}</div>
                <div className="mt-0.5 text-[11px] text-[#D8DDEA]">{item.subtitle}</div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════
   左栏 · 丞相判断
   ════════════════════════════════════════════════════════════════════ */

function ChancellorRail() {
  return (
    <div className="rail-panel overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[#F0C66A]/14 px-4 py-3">
        <FileCheck2 size={14} className="text-[#F0C66A]" />
        <div>
          <div className="text-[12px] font-semibold text-[#F5E9C9]">丞相判断</div>
          <div className="text-[10px] text-[#8F98B8]">今日最需要处理的三件事</div>
        </div>
      </div>
      <div className="p-4">
        {/* 暂无真实数据 → 简洁占位卡，不伪造数据 */}
        <div className="rounded-lg border border-[#F0C66A]/16 bg-[#04060E]/60 p-3">
          <div className="text-[11px] leading-relaxed text-[#C7CCDE]">
            尚未有丞相研判可呈。建议先拟旨再上书房：
          </div>
          <ul className="mt-3 space-y-2.5">
            {[
              '在中央卷轴写清一件要务',
              '选择办理风格并「下旨」',
              '于军机处 / 上书房查看回禀',
            ].map((step, i) => (
              <li key={step} className="flex items-start gap-2 text-[11px] text-[#D8DDEA]">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#F0C66A]/40 text-[9px] text-[#F0C66A]">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   左栏 · 朝堂实证（自证清单，重组保留）
   ════════════════════════════════════════════════════════════════════ */

function EvidenceCard() {
  return (
    <div className="rail-panel mt-4 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[#F0C66A]/14 px-4 py-3">
        <Landmark size={14} className="text-[#F0C66A]" />
        <div className="text-[12px] font-semibold text-[#F5E9C9]">朝堂实证</div>
      </div>
      <div className="p-4">
        <ul className="space-y-2">
          {evidence.map((item) => (
            <li key={item.label} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.14em] text-[#8F98B8]">{item.label}</div>
                <div className="mt-0.5 truncate text-[11px] text-[#C7CCDE]">{item.detail}</div>
              </div>
              <span className="shrink-0 text-[12px] font-semibold text-[#B9F6D2]">{item.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   右栏 · 钦天监指导
   ════════════════════════════════════════════════════════════════════ */

function QintianGuide() {
  return (
    <div className="rail-panel overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[#F0C66A]/14 px-4 py-3">
        <Sparkles size={14} className="text-[#F0C66A]" />
        <div>
          <div className="text-[12px] font-semibold text-[#F5E9C9]">钦天监指导</div>
          <div className="text-[10px] text-[#8F98B8]">观星观势 · 御令有章</div>
        </div>
      </div>
      <div className="space-y-4 p-4">
        {TUTORIALS.map((t) => (
          <div key={t.title} className="rounded-lg border border-[#F0C66A]/14 bg-[#04060E]/50 p-3">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-[#F0C66A]">
              <t.icon size={14} />
              {t.title}
            </div>
            <ul className="mt-2.5 space-y-2">
              {t.steps.map((s) => (
                <li key={s} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-[#C7CCDE]">
                  <ChevronRight size={11} className="mt-0.5 shrink-0 text-[#8F98B8]" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className="px-1 text-[10px] leading-relaxed text-[#6A7299]">
          * 钦天监不代陛下决策，仅循天象呈上建议。
        </p>
      </div>
    </div>
  );
}
