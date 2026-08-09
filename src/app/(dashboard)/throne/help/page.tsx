'use client';

/**
 * 陛下视图 · 新手指引
 *
 * 三步入门。像故事一样读完就懂。
 */

import Link from 'next/link';
import { ArrowLeft, ArrowRight, ScrollText, Eye, Crown } from 'lucide-react';
import { Attendant, type AttendantLine } from '@/features/throne/components/attendant';

const HELP_STEPS = [
  {
    icon: <Crown size={16} className="text-[#F0C66A]" />,
    kicker: '第一步 · 您是陛下',
    title: '此系统为您一人而设',
    body: '朝堂是一个有十一路 AI 谋士的指挥中枢。您下旨，它们执行。您只管"想做什么"，它们负责"如何去做"。',
  },
  {
    icon: <ScrollText size={16} className="text-[#F0C66A]" />,
    kicker: '第二步 · 下旨',
    title: '想到什么，就写什么',
    body: '点开"亲笔下达新旨"，写下您的指示 — 不必字斟句酌。丞相会研判意图，自动拆解为具体任务，分派六部办理。整个过程您可眼见为实。',
  },
  {
    icon: <Eye size={16} className="text-[#F0C66A]" />,
    kicker: '第三步 · 批示',
    title: '等呈报到案，画一个圈',
    body: '办毕后，丞相会把结果汇成一份白话呈报，摆在您面前。您看一眼，决定"准"或"不准"。若有疑问，随时可问钦天监 — 按 ? 键即可。',
  },
];

const ATTENDANT_LINES: AttendantLine[] = [
  {
    id: 'welcome',
    text: '初来朝堂，不必紧张。钦天监陪您走三步 — 每一步都有实例。读完这一页，您便可立即开工。',
    tone: 'guide',
  },
  {
    id: 'no-tech',
    text: '此系统不需要您懂任何技术。钦天监的职责是把复杂词汇翻成白话。若仍有不解，按 ? 键再问一遍即可。',
    tone: 'guide',
  },
  {
    id: 'two-views',
    text: '朝堂有两种视图："陛下视图"简洁克制，专为您设计；"专业视图"展示所有数据面板，供运营团队使用。您在右上角可随时切换。',
    tone: 'explain',
  },
];

export default function HelpPage() {
  return (
    <div className="relative min-h-screen">
      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 pt-8 md:px-12">
        <Link
          href="/throne"
          className="flex items-center gap-1.5 text-[12px] text-[#9AA3C4] transition-colors hover:text-[#F0C66A]"
        >
          <ArrowLeft size={13} />
          返回朝堂
        </Link>
        <div className="text-[10px] uppercase tracking-[0.3em] text-[#6A7299]">
          新手指引 · Onboarding
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 mx-auto max-w-[820px] px-6 py-16 md:px-12 md:py-20">
        <div className="mb-12 text-center">
          <div className="text-[10px] uppercase tracking-[0.3em] text-[#F0C66A]">
            Welcome to CourtOS
          </div>
          <h1
            className="display-serif mt-3 text-[30px] font-bold leading-tight text-[#FBF7EC] md:text-[40px]"
          >
            三步读完 · 即刻上手
          </h1>
          <p
            className="display-serif mx-auto mt-4 max-w-[540px] text-[14px] leading-relaxed text-[#9AA3C4]"
          >
            朝堂为您而设 — 无须培训，读完这一页便可发令。
          </p>
        </div>

        <ol className="space-y-6">
          {HELP_STEPS.map((step, i) => (
            <li
              key={i}
              className="relative overflow-hidden rounded-2xl border p-7"
              style={{
                borderColor: 'rgba(240,198,106,0.2)',
                background:
                  'linear-gradient(180deg, rgba(20, 16, 8, 0.6), rgba(10, 8, 4, 0.9))',
              }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-20 blur-3xl"
                style={{ background: '#F0C66A' }}
              />
              <div className="relative flex gap-5">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border"
                  style={{
                    borderColor: 'rgba(240,198,106,0.4)',
                    background: 'rgba(240,198,106,0.08)',
                  }}
                >
                  {step.icon}
                </div>
                <div className="flex-1">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-[#F0C66A]">
                    {step.kicker}
                  </div>
                  <h3
                    className="display-serif mt-1.5 text-[20px] font-bold text-[#FBF7EC]"
                  >
                    {step.title}
                  </h3>
                  <p
                    className="display-serif mt-3 text-[14px] leading-relaxed text-[#C8CDD8]"
                  >
                    {step.body}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        {/* Begin CTA */}
        <div className="mt-12 flex flex-col items-center gap-4">
          <Link
            href="/throne/compose"
            className="group inline-flex items-center gap-2 rounded-xl px-8 py-4 text-[14px] font-semibold transition-all"
            style={{
              background: 'linear-gradient(135deg, #F0C66A, #D4A84B)',
              color: '#04060E',
              boxShadow: '0 20px 50px rgba(240,198,106,0.3)',
            }}
          >
            即刻亲笔下达首旨
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/throne"
            className="text-[11px] text-[#6A7299] transition-colors hover:text-[#F0C66A]"
          >
            或返回朝堂查看今日要务
          </Link>
        </div>
      </main>

      <Attendant lines={ATTENDANT_LINES} keyProp="throne-help" />
    </div>
  );
}
