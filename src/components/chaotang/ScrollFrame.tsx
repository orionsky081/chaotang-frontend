'use client';

import type { ReactNode } from 'react';

/**
 * ScrollFrame · 朝堂卷轴组件
 * 金色卷轴边框 + 四角玉珠装饰 + 顶部标题区（回奏/圣旨/奏折）+ 印章
 * 用于上书房、军机处、拟旨、润色、奏折等页面
 */

export type ScrollVariant = 'memorial' | 'edict' | 'draft' | 'reply';

const VARIANT_CONFIG: Record<ScrollVariant, { title: string; seal: string; sealColor: string }> = {
  memorial: { title: '奏折', seal: '御览', sealColor: '#C0392B' },
  edict:    { title: '圣旨', seal: '御览', sealColor: '#C0392B' },
  draft:    { title: '回奏', seal: '辅政', sealColor: '#8B7355' },
  reply:    { title: '回奏', seal: '机密', sealColor: '#8B7355' },
};

interface ScrollFrameProps {
  /** 卷轴变体 */
  variant?: ScrollVariant;
  /** 顶部小标题（如「专署回卷」「奉天承运」） */
  eyebrow?: string;
  /** 副标题（如「丞相谨奏」「皇帝诏曰」） */
  subtitle?: string;
  /** 自定义印章文字（覆盖默认） */
  sealText?: string;
  /** 卷轴内容 */
  children: ReactNode;
  /** 底部操作区 */
  footer?: ReactNode;
  /** 额外 class */
  className?: string;
}

export function ScrollFrame({
  variant = 'memorial',
  eyebrow,
  subtitle,
  sealText,
  children,
  footer,
  className = '',
}: ScrollFrameProps) {
  const config = VARIANT_CONFIG[variant];
  const seal = sealText ?? config.seal;

  return (
    <div className={`relative mx-auto w-full max-w-[820px] ${className}`}>
      {/* 卷轴外框 */}
      <div
        className="relative rounded-sm border px-8 py-6 md:px-12 md:py-8"
        style={{
          borderColor: 'rgba(212,168,75,0.35)',
          background: 'linear-gradient(180deg, rgba(245,233,201,0.06) 0%, rgba(245,233,201,0.02) 100%)',
          boxShadow: '0 0 60px rgba(240,198,106,0.06), inset 0 0 60px rgba(240,198,106,0.03)',
        }}
      >
        {/* 四角玉珠 */}
        <JadeBead position="top-left" />
        <JadeBead position="top-right" />
        <JadeBead position="bottom-left" />
        <JadeBead position="bottom-right" />

        {/* 顶部装饰线 */}
        <div
          className="absolute inset-x-6 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(212,168,75,0.4), transparent)' }}
        />
        <div
          className="absolute inset-x-6 bottom-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(212,168,75,0.4), transparent)' }}
        />

        {/* 标题区 */}
        <header className="mb-6 text-center">
          {eyebrow && (
            <div className="text-[10px] uppercase tracking-[0.32em] text-[#8A6A2A]">{eyebrow}</div>
          )}
          <h2
            className="mt-1 text-[28px] font-bold tracking-[0.15em] text-[#3D2B1F]"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {config.title}
          </h2>
          {subtitle && (
            <div className="mt-1 text-[11px] tracking-[0.18em] text-[#8B7355]">{subtitle}</div>
          )}
          {/* 印章 */}
          <div
            className="mx-auto mt-2 inline-flex h-7 w-7 items-center justify-center rounded-sm border text-[9px] font-bold"
            style={{
              borderColor: `${config.sealColor}60`,
              color: config.sealColor,
              background: `${config.sealColor}08`,
            }}
          >
            {seal}
          </div>
          {/* 装饰点 */}
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="h-px w-8 bg-[#D4A84B]/30" />
            <span className="h-1 w-1 rounded-full bg-[#D4A84B]/50" />
            <span className="h-px w-8 bg-[#D4A84B]/30" />
          </div>
        </header>

        {/* 内容区 */}
        <div className="relative min-h-[200px]">
          {/* 水印印章 */}
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.06]"
            aria-hidden
          >
            <span
              className="text-[120px] font-bold tracking-[0.3em]"
              style={{ fontFamily: 'var(--font-serif)', color: config.sealColor }}
            >
              {seal}
            </span>
          </div>
          <div className="relative z-10">{children}</div>
        </div>

        {/* 底部操作区 */}
        {footer && (
          <div className="mt-6 border-t border-[#D4A84B]/15 pt-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/** 四角玉珠装饰 */
function JadeBead({ position }: { position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }) {
  const posClass = {
    'top-left': '-top-3 -left-3',
    'top-right': '-top-3 -right-3',
    'bottom-left': '-bottom-3 -left-3',
    'bottom-right': '-bottom-3 -right-3',
  }[position];

  return (
    <div
      className={`absolute ${posClass} z-20 grid h-6 w-6 place-items-center rounded-full`}
      style={{
        background: 'radial-gradient(circle at 35% 35%, #E8F5E9, #A5D6A7 40%, #66BB6A 70%, #43A047)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.4)',
      }}
      aria-hidden
    >
      <span className="h-2 w-2 rounded-full bg-white/30" />
    </div>
  );
}
