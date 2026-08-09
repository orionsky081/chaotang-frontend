/**
 * 朝堂 OS V2 · 演示模式
 *
 * 路演杀手锏：
 * - 全屏沉浸
 * - 一次一段
 * - 键盘左右翻页 / ESC 退出
 * - 进度指示器
 * - 封面页 + 结尾"奉天承运"页
 */

'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Crown,
  Users,
  Calendar,
} from 'lucide-react';
import { api } from '@/lib/api/clients/reports';
import { REPORT_TEMPLATE_META, ReportSectionRenderer } from '@/features/reports';
import { AGENT_META } from '@/types/agent';
import type { AgentCode } from '@/types/agent';
import type { Report, ReportSection } from '@/types/report';

type Slide =
  | { kind: 'cover'; report: Report }
  | { kind: 'section'; section: ReportSection; index: number; total: number }
  | { kind: 'outro'; report: Report };

export default function PresentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSlide = Math.max(0, Number(searchParams.get('slide') ?? '0') || 0);

  const [cursor, setCursor] = useState(initialSlide);
  const { data: report, error, isLoading } = useSWR<Report, Error>(
    `backend-presentation:${id}`,
    () => api.reports.getById(id),
  );

  // 计算 slides
  const slides: Slide[] = report
    ? [
        { kind: 'cover', report },
        ...[...report.sections]
          .sort((a, b) => a.order - b.order)
          .map((section, i, arr) => ({
            kind: 'section' as const,
            section,
            index: i,
            total: arr.length,
          })),
        { kind: 'outro', report },
      ]
    : [];

  const total = slides.length;
  const clampedCursor = Math.max(0, Math.min(cursor, total - 1));
  const currentSlide: Slide | undefined = slides[clampedCursor];

  const next = useCallback(() => setCursor((c) => Math.min(c + 1, total - 1)), [total]);
  const prev = useCallback(() => setCursor((c) => Math.max(c - 1, 0)), []);
  const exit = useCallback(() => router.back(), [router]);

  // Sync cursor → ?slide=N (replace, not push, to avoid history pollution)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('slide', String(clampedCursor));
    window.history.replaceState(null, '', url.toString());
  }, [clampedCursor]);

  // 键盘控制
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        exit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, exit]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-[12px] text-[#6A7299]">
        加载呈报中...
      </div>
    );
  }

  if (error || !report || !currentSlide) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <div className="text-[14px] text-[#9AA3C4]">
          {error ? `后端呈报不可读：${error.message}` : '未找到呈报'}
        </div>
        <button
          type="button"
          onClick={exit}
          className="rounded border border-[#F0C66A] px-4 py-2 text-[12px] text-[#F0C66A]"
        >
          返回
        </button>
      </div>
    );
  }

  return (
    <div
      className="relative h-screen w-screen overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at center, #0A0E1E 0%, #04060E 70%, #02030A 100%)',
      }}
    >
      {/* 背景装饰网格 */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(107, 160, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(107, 160, 255, 0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* 顶部品牌 + 退出 */}
      <header className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-8 py-6">
        <div className="pointer-events-auto flex items-center gap-2">
          <Crown size={16} className="text-[#F0C66A]" />
          <span className="gold-text text-[14px] font-bold tracking-widest">朝堂 OS</span>
          <span className="font-mono text-[10px] text-[#484F72]">· PRESENTATION MODE</span>
        </div>
        <button
          type="button"
          onClick={exit}
          className="pointer-events-auto flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] text-[#9AA3C4] transition-colors hover:border-[#F43F5E] hover:text-[#F43F5E]"
          style={{ borderColor: 'rgba(26, 33, 66, 0.8)' }}
        >
          <X size={11} />
          退出演示 · ESC
        </button>
      </header>

      {/* 幻灯片主体 */}
      <main className="relative flex h-full items-center justify-center px-8">
        <div key={clampedCursor} className="animate-fade-in-up w-full max-w-[1100px]">
          {currentSlide.kind === 'cover' && <CoverSlide report={currentSlide.report} />}
          {currentSlide.kind === 'section' && (
            <SectionSlide
              section={currentSlide.section}
              index={currentSlide.index}
              total={currentSlide.total}
              report={report}
            />
          )}
          {currentSlide.kind === 'outro' && <OutroSlide report={currentSlide.report} />}
        </div>
      </main>

      {/* 底部控制栏 */}
      <footer className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between px-8 py-6">
        <button
          type="button"
          onClick={prev}
          disabled={clampedCursor === 0}
          className="flex items-center gap-1 rounded-full border p-2 text-[#9AA3C4] transition-colors hover:border-[#F0C66A] hover:text-[#F0C66A] disabled:opacity-30"
          style={{ borderColor: 'rgba(26, 33, 66, 0.8)' }}
          aria-label="上一页"
        >
          <ChevronLeft size={16} />
        </button>

        {/* 进度圆点 */}
        <div className="flex items-center gap-2">
          {slides.map((_, i) => {
            const isActive = i === clampedCursor;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setCursor(i)}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: isActive ? 24 : 6,
                  backgroundColor: isActive ? '#F0C66A' : 'rgba(107, 160, 255, 0.3)',
                  boxShadow: isActive ? '0 0 8px rgba(240, 198, 106, 0.6)' : undefined,
                }}
                aria-label={`跳到第 ${i + 1} 页`}
              />
            );
          })}
        </div>

        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] text-[#6A7299]">
            {clampedCursor + 1} / {total}
          </span>
          <button
            type="button"
            onClick={next}
            disabled={clampedCursor === total - 1}
            className="flex items-center gap-1 rounded-full border p-2 text-[#9AA3C4] transition-colors hover:border-[#F0C66A] hover:text-[#F0C66A] disabled:opacity-30"
            style={{ borderColor: 'rgba(26, 33, 66, 0.8)' }}
            aria-label="下一页"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </footer>

      {/* 底部提示 */}
      <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 font-mono text-[9px] text-[#484F72]">
        ← → 翻页 · ESC 退出 · 空格下一页
      </div>
    </div>
  );
}

/* ==========================================================================
   封面幻灯
   ========================================================================== */

function CoverSlide({ report }: { report: Report }) {
  const meta = REPORT_TEMPLATE_META[report.template];
  const Icon = meta.Icon;

  return (
    <div className="flex flex-col items-center text-center">
      <div
        className="flex h-20 w-20 items-center justify-center rounded-2xl"
        style={{
          background: `linear-gradient(135deg, ${meta.color}33, ${meta.color}11)`,
          border: `2px solid ${meta.color}66`,
          boxShadow: `0 0 60px ${meta.color}33`,
        }}
      >
        <Icon size={32} style={{ color: meta.color }} strokeWidth={1.5} />
      </div>

      <div className="mt-6 text-[12px] uppercase tracking-[0.3em]" style={{ color: meta.color }}>
        {meta.sublabel}
      </div>

      <h1 className="gold-text display-serif mt-4 text-[54px] font-bold leading-tight tracking-wider">
        {report.title}
      </h1>

      {report.subtitle && (
        <p className="mt-3 text-[18px] text-[#9AA3C4]">{report.subtitle}</p>
      )}

      <div className="mt-10 flex items-center gap-6 font-mono text-[11px] text-[#6A7299]">
        <div className="flex items-center gap-1.5">
          <Calendar size={11} />
          {new Date(report.createdAt).toLocaleDateString('zh-CN')}
        </div>
        <div className="flex items-center gap-1.5">
          <Users size={11} />
          {report.metadata.audience}
        </div>
        <div>v{report.metadata.version}</div>
      </div>

      {/* 协同 Agent */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        {report.metadata.contributingAgents.slice(0, 8).map((code) => {
          const am = AGENT_META[code as AgentCode];
          if (!am) return null;
          return (
            <span
              key={code}
              className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px]"
              style={{
                borderColor: `${am.color}55`,
                backgroundColor: `${am.color}0d`,
                color: am.color,
              }}
            >
              <span>{am.emoji}</span>
              {am.nameCn}
            </span>
          );
        })}
      </div>

      <div
        className="mt-12 text-[11px] italic tracking-wider"
        style={{ color: 'rgba(240, 198, 106, 0.6)' }}
      >
        按 → 或空格开始
      </div>
    </div>
  );
}

/* ==========================================================================
   段落幻灯
   ========================================================================== */

function SectionSlide({
  section,
  index,
  total,
  report,
}: {
  section: ReportSection;
  index: number;
  total: number;
  report: Report;
}) {
  const meta = REPORT_TEMPLATE_META[report.template];

  return (
    <div className="w-full">
      {/* 段落序号 */}
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg font-mono text-[14px] font-bold"
          style={{
            backgroundColor: `${meta.color}18`,
            border: `1.5px solid ${meta.color}66`,
            color: meta.color,
          }}
        >
          §{String(index + 1).padStart(2, '0')}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: meta.color }}>
            Section {index + 1} / {total}
          </div>
          <h2 className="gold-text display-serif text-[36px] font-bold leading-none tracking-wider">
            {section.title}
          </h2>
        </div>
      </div>

      {/* 金色分隔线 */}
      <div
        className="my-6 h-px w-full"
        style={{
          background:
            'linear-gradient(90deg, rgba(240, 198, 106, 0.6), rgba(240, 198, 106, 0.15), transparent)',
        }}
      />

      {/* 段落内容 */}
      <div className="max-h-[calc(100vh-340px)] overflow-y-auto pr-3">
        <ReportSectionRenderer section={section} variant="presentation" />
      </div>
    </div>
  );
}

/* ==========================================================================
   结尾幻灯
   ========================================================================== */

function OutroSlide({ report }: { report: Report }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div
        className="relative flex h-28 w-28 items-center justify-center rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(240, 198, 106, 0.2), rgba(240, 198, 106, 0.05))',
          border: '2px solid rgba(240, 198, 106, 0.5)',
          boxShadow: '0 0 80px rgba(240, 198, 106, 0.35)',
        }}
      >
        <Crown size={44} className="text-[#F0C66A]" strokeWidth={1.5} />
      </div>

      <div className="mt-8 gold-text display-serif text-[44px] font-bold tracking-[0.4em]">
        奉 天 承 运
      </div>

      <div className="mt-4 text-[14px] text-[#9AA3C4]">
        本案已呈陛下御览，恭请批示
      </div>

      <div className="mt-12 font-mono text-[10px] tracking-wider text-[#484F72]">
        — 丞相府 · {report.metadata.author} —
      </div>
      <div className="mt-1 font-mono text-[9px] text-[#484F72]">
        朝堂 OS · CourtOS V2 · {new Date(report.createdAt).toLocaleDateString('zh-CN')}
      </div>
    </div>
  );
}
