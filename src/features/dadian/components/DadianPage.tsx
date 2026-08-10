'use client';

// 顶导由 (dashboard)/layout.tsx 的 ChaotangTopNav 统一接管, 不再渲染自带 TopNav
import PalaceHero from "./PalaceHero";
import BottomBar from "./BottomBar";
import MinisterHotspot from "./MinisterHotspot";
import { ChancellorTodayCard } from "./ChancellorTodayCard";
import { MINISTER_HOTSPOTS } from "@/features/dadian/lib/dadian";
import { assetUrl } from "@/lib/asset";

/**
 * 大殿「部门状态」纯装饰浮动标签群。
 * 沿中轴两侧错落排布, 深底金边圆角, 半透明不挡点击(pointer-events:none)。
 * 仅供视觉对齐设计稿, 不读取任何数据 hook —— 状态为静态示意, 与顶部诚实标注一致。
 */
const DEPT_STATUS_TAGS: {
  name: string;
  status: string;
  color: string;
  side: "left" | "right";
  offset: number;
  top: number;
}[] = [
  { name: "工部", status: "运行中", color: "#3DD68C", side: "left", offset: 10, top: 34 },
  { name: "户部", status: "报审中", color: "#F5A524", side: "right", offset: 10, top: 32 },
  { name: "吏部", status: "运行中", color: "#3DD68C", side: "left", offset: 8, top: 50 },
  { name: "礼部", status: "运行中", color: "#3DD68C", side: "right", offset: 8, top: 48 },
  { name: "兵部", status: "运行中", color: "#3DD68C", side: "left", offset: 12, top: 66 },
  { name: "丞相", status: "会辅中", color: "#F0C66A", side: "left", offset: 34, top: 26 },
  { name: "锦衣卫", status: "待命", color: "#57B7FF", side: "right", offset: 12, top: 66 },
  { name: "钦天监", status: "已上奏", color: "#9B6CF6", side: "right", offset: 32, top: 28 },
  { name: "史馆", status: "已上奏", color: "#9B6CF6", side: "left", offset: 16, top: 74 },
];

function DeptStatusTags() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[15] hidden md:block">
      {DEPT_STATUS_TAGS.map((t) => (
        <div
          key={t.name}
          className="absolute flex items-center gap-1.5 rounded-[10px] border px-2.5 py-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.28)] backdrop-blur-md"
          style={{
            borderColor: "rgba(240,198,106,0.25)",
            background: "rgba(5,8,16,0.72)",
            top: `${t.top}%`,
            ...(t.side === "left" ? { left: `${t.offset}%` } : { right: `${t.offset}%` }),
          }}
        >
          <span className="text-[12px] font-semibold leading-none tracking-[0.08em] text-[#F5E9C9]">
            {t.name}
          </span>
          <span
            className="h-[6px] w-[6px] shrink-0 rounded-full"
            style={{ backgroundColor: t.color, boxShadow: `0 0 8px ${t.color}` }}
          />
          <span className="text-[10px] leading-none tracking-[0.06em]" style={{ color: t.color }}>
            {t.status}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function DadianPage() {
  return (
    <main className="isolate relative h-full min-h-[820px] w-full overflow-hidden bg-[#02050d] text-parchment-50 max-md:h-auto max-md:min-h-[1180px] max-md:overflow-y-auto">
      {/* 全屏连续宫殿底图 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={assetUrl("/assets/dadian/hall-stage-tang.webp?v=2")}
        alt=""
        aria-hidden
        className="absolute inset-0 -z-30 h-full w-full scale-[1.012] object-cover object-center saturate-[1.08] contrast-[1.06]"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-20"
        style={{
          background:
            "linear-gradient(180deg, rgba(2,5,13,0.82) 0%, rgba(2,5,13,0.22) 24%, rgba(2,5,13,0.2) 54%, rgba(2,5,13,0.9) 100%), radial-gradient(105% 84% at 50% 42%, rgba(240,198,106,0.05) 0%, rgba(240,198,106,0.02) 28%, rgba(3,8,16,0.36) 64%, rgba(1,3,8,0.82) 100%), radial-gradient(44% 38% at 50% 22%, rgba(242,199,114,0.18), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.18] mix-blend-screen"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(244,231,192,0.14) 0px, rgba(244,231,192,0.14) 1px, transparent 1px, transparent 22px), repeating-linear-gradient(90deg, rgba(240,198,106,0.08) 0px, rgba(240,198,106,0.08) 1px, transparent 1px, transparent 28px)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-[#02050d]/95 via-[#02050d]/52 to-transparent"
      />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-44 bg-gradient-to-t from-[#02050d]/95 via-[#02050d]/55 to-transparent" />
      <div aria-hidden className="absolute left-1/2 top-[118px] -z-10 h-[62vh] w-[min(42vw,620px)] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(240,198,106,0.18)_0%,rgba(240,198,106,0.055)_34%,transparent_72%)] blur-2xl max-md:top-[184px] max-md:w-[84vw]" />
      <div aria-hidden className="absolute left-1/2 top-[132px] -z-10 h-[calc(100%-244px)] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[#F0C66A]/28 to-transparent max-md:hidden" />
      <div aria-hidden className="absolute left-8 right-8 top-[128px] bottom-[92px] z-0 rounded-[8px] border border-[#F0C66A]/12 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.025),0_0_80px_rgba(0,0,0,0.32)] max-md:hidden" />
      <div aria-hidden className="absolute left-12 right-12 top-[140px] z-0 h-px bg-gradient-to-r from-transparent via-[#F0C66A]/48 to-transparent max-md:hidden" />
      <div aria-hidden className="absolute left-12 right-12 bottom-[108px] z-0 h-px bg-gradient-to-r from-transparent via-[#F0C66A]/28 to-transparent max-md:hidden" />

      {/* 中央百官点击热区 */}
      {MINISTER_HOTSPOTS.map((h) => (
        <MinisterHotspot key={h.id} h={h} />
      ))}

      {/* 部门状态浮动标签群(纯装饰, pointer-events:none 不挡热区点击) */}
      <DeptStatusTags />

      {/* 诚实标注:热区状态为示意排布,非实时工况——避免被误读成真实在办任务数 */}
      <div className="absolute right-4 top-4 z-30 rounded border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] tracking-[0.08em] text-[#9AA3C4] backdrop-blur-sm max-md:static max-md:mb-2 max-md:inline-block">
        各部状态点位为示意排布 · 非实时工况
      </div>

      {/* —— 悬浮玻璃态 UI —— */}
      {/* 丞相今日要务(御前决策压缩器):左上御前位悬浮,真丞相 LLM 建议,不挤中央御座 */}
      <div className="absolute left-6 top-[152px] z-10 w-[330px] max-xl:w-[300px] max-md:static max-md:mt-4 max-md:w-auto max-md:px-4">
        <ChancellorTodayCard />
      </div>
      <PalaceHero />

      {/* 「展开辅政」胶囊按钮:滚动到底部聚焦御前副驾驶栏, 无新路由/弹层 */}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}
        className="absolute bottom-[120px] left-1/2 z-[30] -translate-x-1/2 rounded-full border px-6 py-2.5 text-[12px] font-semibold tracking-[0.12em] transition hover:brightness-125 max-md:bottom-[150px]"
        style={{ borderColor: "rgba(240,198,106,0.45)", background: "rgba(5,8,16,0.72)", color: "#F0C66A", fontFamily: "var(--font-serif)" }}
      >
        展开辅政
      </button>

      <BottomBar />
    </main>
  );
}
