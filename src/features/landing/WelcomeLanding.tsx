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
          <nav className="hidden items-center gap-10 md:flex">
            <a href="#pain-points" className="text-[14px] text-white transition hover:text-[#F5E9C9]">企业痛点</a>
            <a href="#features" className="text-[14px] text-white transition hover:text-[#F5E9C9]">解决方案</a>
            <a href="#scenarios" className="text-[14px] text-white transition hover:text-[#F5E9C9]">适用场景</a>
            <a href="#demo" className="text-[14px] text-white transition hover:text-[#F5E9C9]">预约体验</a>
          </nav>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.2)] bg-transparent px-5 py-2.5 text-[14px] text-white transition hover:border-white hover:text-white"
            >
              已有账号
            </button>
            <button
              type="button"
              onClick={() => router.push('/register')}
              className="inline-flex items-center gap-1.5 rounded-full bg-[linear-gradient(180deg,#C8A45E,#E2B95A)] px-5 py-2.5 text-[14px] font-medium text-[#1A1A1A] transition hover:brightness-110"
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
            className="display-serif text-[80px] font-bold leading-[1.1] text-[#F5E6C8] md:text-[96px]"
          >
            朝堂 OS
          </h1>
          <p className="mt-4 max-w-[680px] text-[32px] leading-8 text-[#E8D5A8] md:text-[36px]" style={{ fontFamily: 'var(--font-serif)' }}>
            把你的公司，交给一座会思考的朝堂
          </p>
          <p className="mt-5 max-w-[640px] text-[16px] leading-7 text-white/70 md:text-[18px]">
            专为老板决策太慢、部门信息割裂、AI 结果不可追责的企业设计。上书房接问题，六部查证，军机处会审，
            <br className="hidden md:block" />东宫代办，史馆归档。你只裁断关键事项。
          </p>

          {/* 痛点标签 */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {PAIN_POINTS.map((point) => (
              <div
                key={point}
                className="rounded-full border border-[rgba(200,164,94,0.3)] bg-[rgba(0,0,0,0.35)] px-[18px] py-2 text-[14px] text-[#E8D5A8] backdrop-blur-sm transition hover:border-[rgba(200,164,94,0.6)] hover:bg-[rgba(0,0,0,0.5)]"
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
              className="group inline-flex items-center gap-2.5 rounded-full px-8 py-3.5 text-[14px] font-medium tracking-[0.06em] transition-all hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(180deg, #C8A45E, #E2B95A)',
                color: '#1A1A1A',
                boxShadow: '0 4px 20px rgba(200,164,94,0.3)',
              }}
            >
              创建朝堂
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              type="button"
              onClick={() => router.push('/about')}
              className="inline-flex items-center gap-2 rounded-full border border-[rgba(200,164,94,0.6)] bg-transparent px-6 py-3 text-[13px] text-[#C8A45E] transition hover:border-[rgba(200,164,94,0.9)] hover:text-[#E8C87A]"
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
            <div className="flex items-center gap-3 border border-[rgba(255,255,255,0.1)] bg-[#0D1117] p-4 backdrop-blur-md" style={{ borderRadius: '12px', height: '56px' }}>
              <input
                type="text"
                defaultValue="这个客户该不该降价签？"
                className="flex-1 bg-transparent text-[14px] text-[#F5E9C9] outline-none placeholder:text-[#58617F]"
                readOnly
              />
              <button
                type="button"
                onClick={() => router.push('/shangshufang')}
                className="inline-flex shrink-0 items-center gap-2 border border-[rgba(200,164,94,0.5)] bg-[#1A1E2E] px-5 py-2.5 text-[12px] font-medium text-[#C8A45E] transition hover:border-[rgba(200,164,94,0.8)]"
                style={{ borderRadius: '10px' }}
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
        <div className="mx-auto mt-8 flex max-w-[1100px] flex-wrap items-center justify-between gap-4 border-t border-[#F0C66A]/10 px-6 pt-6 md:px-10">
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
