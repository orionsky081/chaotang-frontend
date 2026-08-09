import type { ReactNode, SVGProps } from "react";

/**
 * 统一线性图标集（单一描边风格，矢量无限清晰）。
 * 六部徽记 + 顶栏/右栏/快捷宫格图标 + AI 地球 + 品牌徽。
 */
type P = SVGProps<SVGSVGElement>;

function S({ children, sw = 1.6, ...p }: P & { children: ReactNode; sw?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...p}
    >
      {children}
    </svg>
  );
}

/* ----------------------------- 六部徽记 ----------------------------- */
/** 吏部 · 组织人才域 — 人 */
export const MarkLibu = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="7.5" r="3" />
    <path d="M5.5 19.5c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
  </S>
);
/** 兵部 · 任务作战台 — 旌旗 */
export const MarkBingbu = (p: P) => (
  <S {...p}>
    <path d="M7 3v18" />
    <path d="M7 4.5h11l-2.5 3.5L18 11.5H7" />
  </S>
);
/** 工部 · 研发供应链 — 齿轮 */
export const MarkGongbu = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="3.4" />
    <path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7" />
  </S>
);
/** 户部 · 财税资荟 — 元宝/钱 */
export const MarkHubu = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="8.2" />
    <path d="M12 7v10M9.4 9.4c0-1.1 1.1-1.9 2.6-1.9s2.6.8 2.6 1.8c0 2.4-5.2 1.4-5.2 3.8 0 1 1.1 1.8 2.6 1.8s2.6-.8 2.6-1.9" />
  </S>
);
/** 礼部 · 品牌客户域 — 礼器/鼎 */
export const MarkLibu2 = (p: P) => (
  <S {...p}>
    <path d="M6 9h12l-1 7a2 2 0 0 1-2 1.7H9A2 2 0 0 1 7 16L6 9Z" />
    <path d="M5 9c0-1.2 1-2 2.4-2M19 9c0-1.2-1-2-2.4-2M12 9V5.5M10 5.5h4" />
  </S>
);
/** 刑部 · 风控法务司 — 天平 */
export const MarkXingbu = (p: P) => (
  <S {...p}>
    <path d="M12 4v16M7 20h10M5 8h14M5 8 3 13h4L5 8ZM19 8l-2 5h4l-2-5Z" />
    <circle cx="12" cy="4.5" r="0.6" fill="currentColor" />
  </S>
);

/* ----------------------------- AI 地球 ----------------------------- */
/** AI 地球 — 双层公转环 + 星点呼吸 + 外辉光 */
export function Globe({ size = 96 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="g-core" cx="40%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#1b2c5e" />
          <stop offset="55%" stopColor="#0c1430" />
          <stop offset="100%" stopColor="#05070f" />
        </radialGradient>
        <radialGradient id="g-glow" cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor="rgba(212,168,75,0)" />
          <stop offset="100%" stopColor="rgba(212,168,75,0.4)" />
        </radialGradient>
        <radialGradient id="g-highlight" cx="35%" cy="30%" r="40%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <linearGradient id="g-ring" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(235,203,123,0)" />
          <stop offset="50%" stopColor="rgba(235,203,123,0.85)" />
          <stop offset="100%" stopColor="rgba(235,203,123,0)" />
        </linearGradient>
      </defs>

      {/* 外层辉光 */}
      <circle cx="60" cy="60" r="58" fill="url(#g-glow)" />

      {/* 外环虚线 — 慢速反转 */}
      <g
        className="spin-rev-slow"
        style={{ transformOrigin: "60px 60px", transformBox: "fill-box" }}
      >
        <circle
          cx="60"
          cy="60"
          r="54"
          stroke="url(#g-ring)"
          strokeWidth="1"
          fill="none"
          strokeDasharray="3 6"
        />
      </g>

      {/* 球体 */}
      <circle cx="60" cy="60" r="44" fill="url(#g-core)" stroke="#d4a84b" strokeOpacity="0.6" />
      <circle cx="60" cy="60" r="44" fill="url(#g-highlight)" />

      {/* 经纬线 — 慢速旋转 */}
      <g
        className="spin-very-slow"
        style={{ transformOrigin: "60px 60px", transformBox: "fill-box" }}
      >
        <g stroke="#6fb0d8" strokeOpacity="0.6" strokeWidth="1" fill="none">
          <ellipse cx="60" cy="60" rx="44" ry="16" />
          <ellipse cx="60" cy="60" rx="44" ry="32" />
          <path d="M60 16v88M16 60h88" />
          <path d="M28 32c14 10 50 10 64 0M28 88c14-10 50-10 64 0" />
        </g>
      </g>

      {/* 星点 — 闪烁 */}
      <g fill="#ebcb7b">
        <circle cx="48" cy="50" r="1.4" className="blink-soft" />
        <circle cx="74" cy="64" r="1.4" className="blink-soft" style={{ animationDelay: "0.6s" }} />
        <circle cx="58" cy="78" r="1.4" className="blink-soft" style={{ animationDelay: "1.2s" }} />
        <circle cx="66" cy="40" r="1.2" className="blink-soft" style={{ animationDelay: "1.8s" }} />
      </g>

      {/* 内环卫星点 — 公转 */}
      <g
        className="spin-slow"
        style={{ transformOrigin: "60px 60px", transformBox: "fill-box" }}
      >
        <circle cx="60" cy="6" r="1.8" fill="#ebcb7b" />
        <circle cx="60" cy="6" r="3.6" fill="#ebcb7b" opacity="0.25" />
      </g>
    </svg>
  );
}
