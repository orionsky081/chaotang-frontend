'use client';

/**
 * DeptIdentityStrip · 2026-07-23 视觉恢复(批1)
 *
 * 用于"现版是真数据页、旧版是装饰 mock"这一档页面(见 task-restore-visual-batch1/notes.md 三档判据):
 * 只给页面加一点角色身份感(立像 + 称谓 + 一句话),不复原旧版的整套装饰版面、不碰真实数据结构。
 * 立像素材取自仓内已有的 `public/heroes/character-roster/*.webp` 历史人物角色板(每页已配对应人物)。
 */

import { assetUrl } from '@/lib/asset';

export function DeptIdentityStrip({
  portrait,
  name,
  tagline,
  accent = '#F0C66A',
}: {
  /** 相对 public/ 的立像路径，如 `/heroes/character-roster/scribe-sima-qian.webp` */
  portrait: string;
  /** 角色称谓，如 "太史令 · 司马迁" */
  name: string;
  tagline: string;
  accent?: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
      <div
        className="h-14 w-14 shrink-0 rounded-full border"
        style={{
          borderColor: `${accent}59`,
          backgroundImage: `url(${assetUrl(portrait)})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
        }}
        role="img"
        aria-label={`${name} 立像`}
      />
      <div>
        <div className="text-[10px] tracking-[0.18em]" style={{ color: accent }}>{name}</div>
        <div className="mt-0.5 text-[12px] text-white/55">{tagline}</div>
      </div>
    </div>
  );
}
