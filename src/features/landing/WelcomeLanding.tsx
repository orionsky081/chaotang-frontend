'use client';

/**
 * WelcomeLanding · 朝堂OS 产品营销落地页
 * 设计图对照：全屏宫殿背景 + "朝堂OS"大标题 + 痛点标签 + CTA 按钮 + 底部奏折预览卡片
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Scroll } from 'lucide-react';
import { assetUrl } from '@/lib/asset';
import { getSession } from '@/lib/auth';

const PAIN_POINTS = [
  '老板被小事淹没',
  '部门信息割裂',
  'AI 输出不可追责',
  '增长动作失控',
];

export function WelcomeLanding() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // 已登录用户直接跳过落地页（存储读写仅允许在 @/lib/auth 内）
    const session = getSession();
    if (session) {
      router.replace('/throne');
    }
  }, [router]);

  if (!mounted) {
    return <div className="min-h-screen bg-[#02050d]" />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#02050d]">
      {/* —— 全屏宫殿底图 —— */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={assetUrl('/assets/intro/courtos-vision-hero.png')}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover object-center opacity-50"
      />
      {/* 遮罩层 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(2,5,13,0.88) 0%, rgba(2,5,13,0.52) 30%, rgba(2,5,13,0.40) 50%, rgba(2,5,13,0.72) 75%, rgba(2,5,13,0.96) 100%)',
        }}
      />
      {/* 金色光晕 */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[18%] h-[52vh] w-[48vw] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(240,198,106,0.18) 0%, rgba(240,198,106,0.04) 40%, transparent 72%)',
        }}
      />
      {/* 网格纹理 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(rgba(240,198,106,1) 1px, transparent 1px), linear-gradient(90deg, rgba(240,198,106,1) 1px, transparent 1px)',
          backgroundSize: '96px 96px',
        }}
      />

      {/* —— 内容层 —— */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* 顶栏 */}
        <header className="flex items-center justify-between px-6 py-5 md:px-10">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-[#F0C66A]/50 bg-[#F0C66A]/10 text-[16px]">🐉</span>
            <div>
              <div className="text-[15px] font-bold tracking-[0.1em] text-[#F5E9C9]" style={{ fontFamily: 'var(--font-serif)' }}>朝堂 OS</div>
              <div className="text-[9px] tracking-[0.12em] text-[#6A7299]">COURTOS</div>
            </div>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#pain-points" className="text-[12px] text-[#9AA3C4] transition hover:text-[#F5E9C9]">企业痛点</a>
            <a href="#features" className="text-[12px] text-[#9AA3C4] transition hover:text-[#F5E9C9]">解决方案</a>
            <a href="#scenarios" className="text-[12px] text-[#9AA3C4] transition hover:text-[#F5E9C9]">适用场景</a>
            <a href="#demo" className="text-[12px] text-[#9AA3C4] transition hover:text-[#F5E9C9]">预约体验</a>
          </nav>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[12px] text-[#C6BB9D] transition hover:border-white/15 hover:text-[#F5E9C9]"
            >
              已有账号
            </button>
            <button
              type="button"
              onClick={() => router.push('/register')}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#F0C66A]/30 bg-[#F0C66A]/15 px-4 py-2 text-[12px] font-semibold text-[#F0C66A] transition hover:bg-[#F0C66A]/25"
            >
              创建朝堂
              <ArrowRight size={13} />
            </button>
          </div>
        </header>

        {/* 主英雄区 */}
        <section className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center md:py-20">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#F0C66A]/20 bg-[#F0C66A]/[0.06] px-4 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3DD68C]" />
            <span className="text-[11px] tracking-[0.18em] text-[#F0C66A]">AI 决策操作系统</span>
          </div>
          <h1
            className="display-serif text-[52px] font-bold leading-[1.1] text-[#F6EFD8] md:text-[72px]"
          >
            朝堂 OS
          </h1>
          <p className="mt-4 max-w-[680px] text-[18px] leading-8 text-[#D8C99A] md:text-[22px]" style={{ fontFamily: 'var(--font-serif)' }}>
            把你的公司，交给一座会思考的朝堂
          </p>
          <p className="mt-5 max-w-[640px] text-[13px] leading-7 text-[#9AA3C4] md:text-[14px]">
            专为老板决策太慢、部门信息割裂、AI 结果不可追责的企业设计。上书房接问题，六部查证，军机处会审，
            <br className="hidden md:block" />东宫代办，史馆归档。你只裁断关键事项。
          </p>

          {/* 痛点标签 */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {PAIN_POINTS.map((point) => (
              <div
                key={point}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[12px] text-[#C6BB9D] backdrop-blur-sm"
              >
                {point}
              </div>
            ))}
          </div>

          {/* CTA 按钮 */}
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <button
              type="button"
              onClick={() => router.push('/register')}
              className="group inline-flex items-center gap-2.5 rounded-full px-8 py-3.5 text-[14px] font-semibold tracking-[0.06em] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(240,198,106,0.25)]"
              style={{
                background: 'linear-gradient(135deg, #F0C66A, #D4A84B 50%, #8A6A2A)',
                color: '#04060E',
              }}
            >
              创建朝堂
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              type="button"
              onClick={() => router.push('/about')}
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-6 py-3 text-[13px] text-[#C6BB9D] transition hover:border-white/20 hover:text-[#F5E9C9]"
            >
              先看解决什么痛点
              <ArrowRight size={14} />
            </button>
          </div>
        </section>

        {/* 底部 Demo 区 */}
        <section id="demo" className="px-6 pb-16 md:px-10">
          <div className="mx-auto max-w-[900px]">
            {/* 试问朝堂 */}
            <div className="mb-3 text-[12px] text-[#6A7299]">试问朝堂</div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0A0F1E]/80 p-3 backdrop-blur-md">
              <input
                type="text"
                defaultValue="这个客户该不该降价签？"
                className="flex-1 bg-transparent text-[14px] text-[#F5E9C9] outline-none placeholder:text-[#58617F]"
                readOnly
              />
              <button
                type="button"
                onClick={() => router.push('/shangshufang')}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#F0C66A]/30 bg-[#F0C66A]/10 px-4 py-2 text-[12px] font-medium text-[#F0C66A] transition hover:bg-[#F0C66A]/20"
              >
                <Scroll size={14} />
                生成奏折
              </button>
            </div>

            {/* 朝堂链路 + 奏折预览 */}
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-white/8 bg-[#05070D]/60 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] text-[#6A7299]">朝堂链路</span>
                  <span className="rounded-full border border-[#3DD68C]/30 bg-[#3DD68C]/10 px-2 py-0.5 text-[9px] text-[#3DD68C]">静态预览</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['上书房', '六部', '军机处', '东宫', '史馆'].map((step) => (
                    <span key={step} className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-[#9AA3C4]">
                      {step}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-white/8 bg-[#05070D]/60 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] text-[#6A7299]">奏折预览</span>
                  <span className="rounded-full border border-[#F43F5E]/30 bg-[#F43F5E]/10 px-2 py-0.5 text-[9px] text-[#F43F5E]">伏候圣裁</span>
                </div>
                <div className="text-[14px] font-medium text-[#F5E9C9]" style={{ fontFamily: 'var(--font-serif)' }}>
                  客户降价签约 · 待裁奏折
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 底部导航 */}
        <div className="mx-auto mt-8 flex max-w-[1100px] flex-wrap items-center justify-between gap-4 border-t border-white/[0.06] px-6 pt-6 md:px-10">
          <div className="text-[11px] tracking-[0.08em] text-[#58617F]">
            © 2026 朝堂OS · CourtOS · 东方治理智能体
          </div>
          <div className="flex items-center gap-4 text-[11px] text-[#6A7299]">
            <button
              type="button"
              onClick={() => router.push('/intro?force=1')}
              className="transition hover:text-[#F0C66A]"
            >
              观看完整开场
            </button>
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="transition hover:text-[#F0C66A]"
            >
              登录
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
