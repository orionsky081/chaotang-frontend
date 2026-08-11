'use client';

/**
 * DecreeInput · 底部面板 · 上书房
 * 匹配效果图：
 *   左侧头像+问丞相 | 输入框+问按钮 | 润色/下旨/密旨/丞相/钦天监 | 右侧问钦天监+头像
 */

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from 'react';
import { FileText, Lock, MessageSquare, Paperclip, Scroll, Telescope } from 'lucide-react';

import { assetUrl } from '@/lib/asset';
import { SHANGSHUFANG_ASSETS } from '../constants';
import type { DecreeMode, DecreeState } from '../types';

export type AskTarget = 'chancellor' | 'mentor';

const GOLD = '#F0C66A';
const SECRET = '***';

const MODE_OPTIONS: Array<{
  key: 'order' | 'secret' | 'ask-chancellor' | 'ask-mentor';
  mode: DecreeMode;
  askTarget?: AskTarget;
  label: string;
  icon: 'ask' | 'mentor' | 'order' | 'secret';
}> = [
  { key: 'order', mode: 'order', label: '下旨', icon: 'order' },
  { key: 'secret', mode: 'secret', label: '密旨', icon: 'secret' },
  { key: 'ask-chancellor', mode: 'ask', askTarget: 'chancellor', label: '丞相', icon: 'ask' },
  { key: 'ask-mentor', mode: 'ask', askTarget: 'mentor', label: '钦天监', icon: 'mentor' },
];

export interface DecreeInputProps {
  value: string;
  onChange: (v: string) => void;
  mode: DecreeMode;
  askTarget?: AskTarget;
  onModeChange: (m: DecreeMode) => void;
  onAskTargetChange?: (target: AskTarget) => void;
  onSend: () => void;
  onPolish?: () => void;
  onFileUpload?: (file: File) => void;
  state: DecreeState;
  message: string | null;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  showContext?: boolean;
  availableModes?: DecreeMode[];
  submitLabel?: string;
  showChancellorPanel?: boolean;
  showMentorPanel?: boolean;
  onToggleChancellorPanel?: () => void;
  onToggleMentorPanel?: () => void;
}

export function DecreeInput({
  value,
  onChange,
  mode,
  askTarget = 'chancellor',
  onModeChange,
  onAskTargetChange,
  onSend,
  onPolish,
  onFileUpload,
  state,
  message,
  inputRef,
  availableModes = ['ask', 'order', 'secret'],
  submitLabel = '呈递',
  showChancellorPanel = false,
  showMentorPanel = false,
  onToggleChancellorPanel,
  onToggleMentorPanel,
}: DecreeInputProps) {
  const isComposingRef = useRef(false);
  const [localValue, setLocalValue] = useState(value);
  const isSecret = mode === 'secret';
  const isMentorAsk = mode === 'ask' && askTarget === 'mentor';
  const accent = isSecret ? SECRET : GOLD
  const busy = state === 'consulting';

  useEffect(() => {
    if (isComposingRef.current) return;
    setLocalValue(value);
  }, [value]);

  const handlePrimarySubmit = () => {
    onSend();
  };

  const handlePolishClick = () => {
    onPolish?.();
  };

  const handleModeButtonClick = (item: typeof MODE_OPTIONS[number]) => {
    onModeChange(item.mode);
    if (item.mode === 'ask') onAskTargetChange?.(item.askTarget ?? 'chancellor');
    onSend();
  };

  const isImeCompositionKey = (event: ReactKeyboardEvent<HTMLTextAreaElement>) =>
    isComposingRef.current ||
    event.nativeEvent.isComposing ||
    event.key === 'Process' ||
    event.keyCode === 229;

  const handleTextValue = (nextValue: string) => {
    setLocalValue(nextValue);
    if (!isComposingRef.current) onChange(nextValue);
  };

  const displayOptions = MODE_OPTIONS.filter(m => availableModes.includes(m.mode));

  return (
    <div
      data-three-axis-decree-input
      className="fixed inset-x-0 bottom-0 z-[215] w-full"
      style={{ background: 'rgba(5,7,13,0.95)', backdropFilter: 'blur(14px)' }}
    >
      {/* 顶部金线 */}
      <div
        aria-hidden
        className="h-px w-full"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, boxShadow: `0 0 16px ${accent}66` }}
      />

      {/* 内容区 */}
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-2.5">

        {/* ─── 左侧：问丞相 ─── */}
        <button
          type="button"
          onClick={() => onToggleChancellorPanel?.()}
          className="flex shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-white/5"
          style={showChancellorPanel ? { background: 'rgba(240,198,106,0.12)' } : undefined}
        >
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-[#F0C66A]/30 bg-[#1a1a1a]">
            <img
              src={assetUrl(SHANGSHUFANG_ASSETS.portraitChancellor)}
              alt="丞相"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="text-[12px] font-medium text-[#F5E9C9]">问丞相</span>
            <span className="text-[9px] text-[#8A9BB8]">历史判断与辩证</span>
          </span>
        </button>

        {/* ─── 上传附件 ─── */}
        {onFileUpload && (
          <label
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md transition hover:brightness-110"
            style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)' }}
            title="上传附件"
          >
            <Paperclip size={14} className="text-[#C8C8C8]" />
            <input
              type="file"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFileUpload(file);
                e.currentTarget.value = '';
              }}
            />
          </label>
        )}

        {/* ─── 输入框 ─── */}
        <textarea
          ref={inputRef}
          value={localValue}
          onChange={(e) => handleTextValue(e.currentTarget.value)}
          onCompositionStart={() => { isComposingRef.current = true; }}
          onCompositionEnd={(e) => {
            isComposingRef.current = false;
            setLocalValue(e.currentTarget.value);
            onChange(e.currentTarget.value);
          }}
          onKeyDown={(e) => {
            if (isImeCompositionKey(e)) return;
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
          }}
          rows={1}
          maxLength={2000}
          placeholder={
            mode === 'order'
              ? '直接说您的裁决：准、驳回、补证或让谁先办。'
              : isSecret
                ? '密旨直发全蜂群：让各司直陈利弊、冲突与风险。'
                : isMentorAsk
                  ? '问钦天监：下一步该怎么问、先补什么证据？'
                  : '问丞相：这件事该先准、先驳回，还是先补证？'
          }
          className="min-w-0 flex-1 resize-none rounded-full px-3.5 py-2 text-[12.5px] leading-[1.45] text-[#F5E9C9] placeholder:text-[#8F835F] focus:outline-none"
          style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${accent}44`, fontFamily: 'var(--font-serif)', height: '36px' }}
        />

        {/* ─── 功能按钮组：润色 → 下旨 → 密旨 → 丞相 → 钦天监 ─── */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={handlePolishClick}
            disabled={busy}
            className="inline-flex h-8 items-center justify-center gap-1 rounded-md border px-2.5 text-[11px] font-semibold transition hover:brightness-110 disabled:opacity-50"
            style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#C8C8C8' }}
          >
            <FileText size={11} />
            润色
          </button>

          {displayOptions.map((item) => {
            const selected = mode === item.mode && (item.mode !== 'ask' || item.askTarget === askTarget);
            const Icon = item.icon === 'ask' ? MessageSquare : item.icon === 'mentor' ? Telescope : item.icon === 'order' ? Scroll : Lock;
            const tone = item.mode === 'secret' ? SECRET : GOLD
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleModeButtonClick(item)}
                aria-label={item.label}
                title={item.label}
                className="inline-flex h-8 items-center justify-center gap-1 rounded-md border px-2.5 text-[11px] font-semibold transition-all hover:brightness-110"
                style={{
                  borderColor: selected ? `${tone}55` : 'rgba(255,255,255,0.08)',
                  background: selected ? `${tone}18` : 'rgba(255,255,255,0.04)',
                  color: selected ? tone : '#C8C8C8',
                }}
              >
                <Icon size={11} />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* ─── 右侧：问钦天监 ─── */}
        <button
          type="button"
          onClick={() => onToggleMentorPanel?.()}
          className="flex shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-white/5"
          style={showMentorPanel ? { background: 'rgba(240,198,106,0.12)' } : undefined}
        >
          <span className="hidden flex-col items-end leading-tight sm:flex">
            <span className="text-[12px] font-medium text-[#F5E9C9]">问钦天监</span>
            <span className="text-[9px] text-[#8A9BB8]">先机判断与风险</span>
          </span>
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-[#9B6CF6]/30 bg-[#1a1a1a]">
            <img
              src={assetUrl(SHANGSHUFANG_ASSETS.portraitWang)}
              alt="钦天监"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </button>
      </div>

      {/* 错误消息 */}
      {message && (
        <div className="mx-auto max-w-[1400px] px-4 pb-2">
          <div className="rounded-lg border px-3 py-2 text-[11px]" style={{ borderColor: 'rgba(122,36,30,0.38)', background: 'rgba(246,233,201,0.98)', color: '#7A241E' }}>
            {message}
          </div>
        </div>
      )}
    </div>
  );
}
