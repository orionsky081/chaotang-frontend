'use client';

/**
 * 亲笔朱批 · Ceremonial Compose
 *
 * 发令的英雄时刻。全屏、居中、无多余装饰。
 * 输入时下方浮现"丞相待命"的微型指示。
 * 提交后触发朱印动画 → 跳转任务页。
 *
 * `paper` 模式：嵌入圣旨卷轴（scroll-paper）内的拟旨编辑器。
 * 仅改变视觉排版，state / 校验 / 提交 API 与全屏模式完全一致。
 */

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Send, Loader2, ArrowLeft, Sparkles } from 'lucide-react';
import { chaotang } from '@/lib/api/clients/chaotang';
import type { ExecutionMode } from '@/types/task';
import { PromptSuggester } from '@/components/PromptSuggester';
import { StarterPrompts } from './starter-prompts';
import { SealStamp } from './seal-stamp';

export interface CeremonialComposeProps {
  /** Optional pre-fill from a signal or context */
  prefill?: string;
  /** Render without full-screen chrome when embedded in another page. */
  embedded?: boolean;
  /** Render with scroll-paper ink palette (for the throne compose edict editor). */
  paper?: boolean;
}

// 卷轴纸墨色（与 globals.css .scroll-paper 呼应）
const INK = '#3a2f18'; // 玄墨
const INK_MUTED = '#6E5A2A'; // 淡墨
const INK_SOFT = '#9a8a5f'; // 弱墨
const VERMILION = '#9E2B25'; // 朱红（提示条）

export function CeremonialCompose({
  prefill = '',
  embedded = false,
  paper = false,
}: CeremonialComposeProps) {
  const router = useRouter();
  const [raw, setRaw] = useState(prefill);
  const [mode, setMode] = useState<ExecutionMode>('hybrid');
  const [submitting, setSubmitting] = useState(false);
  const [sealOpen, setSealOpen] = useState(false);
  const [nextHref, setNextHref] = useState<string>('/court-briefing');
  const [showSuggester, setShowSuggester] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  // auto-resize textarea
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = 'auto';
    ref.current.style.height = `${Math.min(ref.current.scrollHeight, 300)}px`;
  }, [raw]);

  const submit = async () => {
    if (!raw.trim() || submitting) return;
    setSubmitting(true);
    try {
      // 拟旨 → 后端签发一次性派单票据 → 下旨 (chaotang 路径，不走 legacy /api/court/backend/*)
      const draft = await chaotang.decreeDraft(raw.trim());
      const result = await chaotang.decreeDispatch({
        rawCommand: raw.trim(),
        dispatchToken: draft.dispatchInstruction.dispatchToken,
        mode,
      });
      setNextHref(`/command-center?task=${encodeURIComponent(result.taskId)}`);
      setSealOpen(true);
    } catch {
      setSubmitting(false);
    }
  };

  const charCount = raw.length;
  const canSubmit = raw.trim().length >= 4 && !submitting;

  /* ════════════════════════════════════════════════════════════════════
     paper 模式：卷轴内拟旨编辑器
     仅在视觉/布局上做适配，state / submit / 校验逻辑完全复用上方。
     ════════════════════════════════════════════════════════════════════ */
  if (paper) {
    return (
      <div className="relative w-full">
        <main className="relative w-full px-4 py-2 md:px-6">
          {/* 陛下请亲笔 */}
          <div className="mb-2 text-center text-[11px] uppercase tracking-[0.3em]" style={{ color: INK_MUTED }}>
            陛下请亲笔 · 拟旨
          </div>

          {/* 大输入框 */}
          <div className="relative w-full">
            {/* 顶部细线 */}
            <div
              aria-hidden
              className="absolute -top-px inset-x-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(158,43,37,0.5), transparent)' }}
            />
            <textarea
              ref={ref}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  submit();
                }
              }}
              disabled={submitting}
              rows={3}
              placeholder="例如：本月需评估三件要务，请丞相统筹拟议..."
              className="display-serif w-full resize-none border-0 bg-transparent px-2 py-4 text-center text-[19px] leading-relaxed outline-none disabled:opacity-40 md:text-[21px]"
              style={{ color: INK, caretColor: VERMILION }}
            />
            {/* 底部细线 */}
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(158,43,37,0.5), transparent)' }}
            />
            {/* 字数 */}
            <div className="mt-2 text-right text-[10px]" style={{ color: INK_SOFT }}>
              {charCount > 0 && `${charCount} 字`}
            </div>
          </div>

          {/* Prompt Suggester — 建议增强下旨 */}
          {showSuggester && raw.trim().length >= 4 && (
            <div className="mt-6 w-full">
              <div className="mb-3 flex items-center gap-2 text-[12px]" style={{ color: INK_MUTED }}>
                <Sparkles size={14} />
                <span>✨ 朝堂秘书建议</span>
              </div>
              <PromptSuggester
                onSelect={(prompt, mode) => {
                  setRaw(prompt);
                  setShowSuggester(false);
                }}
              />
            </div>
          )}

          {/* Toggle suggester button */}
          {!showSuggester && raw.trim().length >= 4 && (
            <button
              type="button"
              onClick={() => setShowSuggester(true)}
              className="mt-6 flex items-center gap-2 rounded-lg border px-4 py-2 text-[12px] transition-all"
              style={{
                borderColor: 'rgba(240,198,106,0.55)',
                background: 'rgba(240,198,106,0.12)',
                color: INK_MUTED,
              }}
            >
              <Sparkles size={13} />
              需要朝堂秘书建议？
            </button>
          )}

          {/* Mode selector */}
          <div className="mt-7 flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: INK_SOFT }}>
              办理风格：
            </span>
            {(
              [
                { v: 'scripted', label: '照本宣科', desc: '稳妥守旧' },
                { v: 'hybrid', label: '规矩变通', desc: '折中之选' },
                { v: 'live', label: '随机应变', desc: '灵活大胆' },
              ] as { v: ExecutionMode; label: string; desc: string }[]
            ).map((m) => {
              const active = mode === m.v;
              return (
                <button
                  key={m.v}
                  type="button"
                  onClick={() => setMode(m.v)}
                  disabled={submitting}
                  className="rounded-md border px-3 py-1.5 text-[11px] transition-all"
                  style={{
                    borderColor: active ? INK_MUTED : 'rgba(158,43,37,0.25)',
                    background: active ? 'rgba(240,198,106,0.28)' : 'transparent',
                    color: active ? INK : INK_MUTED,
                  }}
                  title={m.desc}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* 下旨 · 主操作（金色胶囊，行为与全屏版完全一致） */}
          <div className="mt-9 flex flex-col items-center">
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="group inline-flex items-center gap-3 rounded-full px-10 py-3.5 text-[15px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-30"
              style={{
                background: canSubmit
                  ? 'linear-gradient(135deg, #F0C66A, #D4A84B)'
                  : 'rgba(240,198,106,0.25)',
                color: '#04060E',
                boxShadow: canSubmit ? '0 18px 44px rgba(212,168,75,0.45)' : 'none',
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  恭呈丞相
                </>
              ) : (
                <>
                  <Send size={15} className="transition-transform group-hover:-rotate-12" />
                  下旨
                </>
              )}
            </button>
            {/* Keyboard hint */}
            <div className="mt-3 text-[10px]" style={{ color: INK_SOFT }}>
              ⌘ + Enter 快速发令
            </div>
          </div>

          {/* 启发式命令（未输入时展示） */}
          {!raw.trim() && (
            <div className="mt-8">
              <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.25em]" style={{ color: INK_MUTED }}>
                <Sparkles size={11} style={{ color: INK_MUTED }} />
                若一时难以下笔，可从这些开始
              </div>
              <StarterPrompts paper onSelect={setRaw} />
            </div>
          )}
        </main>

        {/* Seal animation overlay — 与原版同一覆盖层 */}
        <SealStamp
          open={sealOpen}
          inscription="御旨"
          onComplete={() => router.push(nextHref)}
        />
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════
     全屏 / embedded 模式（原版渲染，保持不变）
     ════════════════════════════════════════════════════════════════════ */
  return (
    <div className={`relative w-full overflow-hidden ${embedded ? 'min-h-0' : 'min-h-screen'}`}>
      {/* Ambient background */}
      {!embedded && <AmbientBackground />}

      {/* Top bar */}
      {!embedded && <header className="relative z-10 flex items-center justify-between px-8 pt-8">
        <Link
          href="/court-briefing"
          className="flex items-center gap-1.5 text-[12px] text-[#9AA3C4] transition-colors hover:text-[#F0C66A]"
        >
          <ArrowLeft size={13} />
          返回朝堂
        </Link>
        <div className="text-[10px] uppercase tracking-[0.3em] text-[#6A7299]">
          亲笔朱批 · Imperial Compose
        </div>
      </header>}

      {/* Main */}
      <main
        className={`relative z-10 mx-auto flex max-w-[860px] flex-col items-center justify-center px-6 ${
          embedded ? 'min-h-0 py-10 md:py-12' : 'min-h-[calc(100vh-80px)] py-12'
        }`}
      >
        {/* Prompt label */}
        <div
          className="mb-6 text-center text-[11px] uppercase tracking-[0.3em]"
          style={{ color: '#F0C66A' }}
        >
          陛下请亲笔
        </div>

        <h1 className={`display-serif mb-10 text-center font-bold leading-tight text-[#FBF7EC] ${embedded ? 'text-[22px] md:text-[28px]' : 'text-[24px] md:text-[32px]'}`}>
          此刻欲下何旨？
        </h1>

        {/* The input */}
        <div className="relative w-full max-w-[720px]">
          {/* Top hairline */}
          <div
            aria-hidden
            className="absolute -top-px inset-x-0 h-px"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(240,198,106,0.5), transparent)',
            }}
          />
          <textarea
            ref={ref}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
            }}
            disabled={submitting}
            rows={3}
            placeholder="例如：本月需评估三件要务，请丞相统筹拟议..."
            className="display-serif w-full resize-none border-0 bg-transparent px-2 py-4 text-center text-[20px] leading-relaxed text-[#FBF7EC] outline-none placeholder:text-[#484F72] disabled:opacity-40"
          />
          {/* Bottom hairline */}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-px"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(240,198,106,0.5), transparent)',
            }}
          />
          {/* Char count */}
          <div className="mt-2 text-right text-[10px] text-[#484F72]">
            {charCount > 0 && `${charCount} 字`}
          </div>
        </div>

        {/* Prompt Suggester — 建议增强下旨 */}
        {showSuggester && raw.trim().length >= 4 && (
          <div className="mt-8 w-full max-w-[720px]">
            <div className="mb-3 flex items-center gap-2 text-[12px] text-[#F0C66A]">
              <Sparkles size={14} />
              <span>✨ 朝堂秘书建议</span>
            </div>
            <PromptSuggester
              onSelect={(prompt, mode) => {
                setRaw(prompt);
                setShowSuggester(false);
              }}
            />
          </div>
        )}

        {/* Toggle suggester button */}
        {!showSuggester && raw.trim().length >= 4 && (
          <button
            type="button"
            onClick={() => setShowSuggester(true)}
            className="mt-6 flex items-center gap-2 rounded-lg border border-[#F0C66A]/30 bg-[#F0C66A]/5 px-4 py-2 text-[12px] text-[#F0C66A] transition-all hover:bg-[#F0C66A]/10"
          >
            <Sparkles size={13} />
            需要朝堂秘书建议？
          </button>
        )}

        {/* Mode selector */}
        <div className="mt-8 flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-[#6A7299]">
            办理风格：
          </span>
          {(
            [
              { v: 'scripted', label: '照本宣科', desc: '稳妥守旧' },
              { v: 'hybrid', label: '规矩变通', desc: '折中之选' },
              { v: 'live', label: '随机应变', desc: '灵活大胆' },
            ] as { v: ExecutionMode; label: string; desc: string }[]
          ).map((m) => {
            const active = mode === m.v;
            return (
              <button
                key={m.v}
                type="button"
                onClick={() => setMode(m.v)}
                disabled={submitting}
                className="rounded-md border px-3 py-1.5 text-[10px] transition-all"
                style={{
                  borderColor: active ? '#F0C66A' : 'rgba(255,255,255,0.08)',
                  background: active ? 'rgba(240,198,106,0.08)' : 'transparent',
                  color: active ? '#F0C66A' : '#9AA3C4',
                }}
                title={m.desc}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="group mt-10 inline-flex items-center gap-3 rounded-xl px-10 py-4 text-[15px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-25"
          style={{
            background: canSubmit
              ? 'linear-gradient(135deg, #F0C66A, #D4A84B)'
              : 'rgba(240,198,106,0.2)',
            color: '#04060E',
            boxShadow: canSubmit ? '0 20px 50px rgba(240,198,106,0.35)' : 'none',
          }}
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              恭呈丞相
            </>
          ) : (
            <>
              <Send size={15} className="transition-transform group-hover:-rotate-12" />
              朱笔御批 · 下达旨令
            </>
          )}
        </button>

        {/* Keyboard hint */}
        <div className="mt-3 text-[10px] text-[#484F72]">
          ⌘ + Enter 快速发令
        </div>

        {/* Divider */}
        {!raw.trim() && (
          <>
            <div
              aria-hidden
              className="my-16 h-px w-24"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(240,198,106,0.3), transparent)',
              }}
            />
            <StarterPrompts onSelect={setRaw} />
          </>
        )}
      </main>

      {/* Seal animation overlay */}
      <SealStamp
        open={sealOpen}
        inscription="御旨"
        onComplete={() => router.push(nextHref)}
      />
    </div>
  );
}

/* ==========================================================================
   Ambient background — subtle constellation dots + golden glow
   ========================================================================== */

function AmbientBackground() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 30%, rgba(240,198,106,0.08), transparent 70%),
            radial-gradient(ellipse 120% 80% at 50% 100%, rgba(107,160,255,0.04), transparent 60%),
            linear-gradient(180deg, #04060E 0%, #0A0E1E 50%, #04060E 100%)
          `,
        }}
      />
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(240,198,106,1) 1px, transparent 1px), linear-gradient(90deg, rgba(240,198,106,1) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />
      {/* Faint stars */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, rgba(240,198,106,0.6) 1px, transparent 2px), radial-gradient(circle at 80% 50%, rgba(240,198,106,0.5) 1px, transparent 2px), radial-gradient(circle at 60% 80%, rgba(240,198,106,0.5) 1px, transparent 2px), radial-gradient(circle at 40% 20%, rgba(240,198,106,0.4) 1px, transparent 2px)',
          backgroundSize: '200px 200px, 250px 250px, 300px 300px, 180px 180px',
        }}
      />
    </div>
  );
}
