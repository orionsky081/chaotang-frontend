'use client';

/**
 * 朝堂 OS · 关于与使用说明
 *
 * 所有说明性内容（产品定位 / 用户主线 / 术语对照 / 钩子说明 / 快捷键）
 * 从各主界面抽出后集中于此。主界面不再重复解释自身。
 */

import Link from 'next/link';
import {
  ArrowLeft,
  Crown,
  BookOpen,
  Compass,
  Sparkles,
  Building2,
} from 'lucide-react';

export default function GuidePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#04060E]">
      <Backdrop />

      <div className="relative z-10 mx-auto max-w-[980px] px-6 py-10 md:px-10 md:py-14">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/throne"
            className="flex items-center gap-1.5 text-[12px] text-[#9AA3C4] transition-colors hover:text-[#F0C66A]"
          >
            <ArrowLeft size={13} />
            返回王座
          </Link>
          <div className="text-[10px] uppercase tracking-[0.3em] text-[#6A7299]">
            朝堂 OS · 关于与用法
          </div>
        </div>

        {/* Hero */}
        <section className="mt-10">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{
                background:
                  'radial-gradient(circle at 30% 30%, #F0C66A, #8A6A2A)',
                boxShadow: '0 0 24px rgba(240,198,106,0.28)',
              }}
            >
              <Crown size={18} className="text-[#04060E]" />
            </div>
            <div className="display-serif text-[13px] font-semibold tracking-[0.24em] text-[#F0C66A]">
              关于朝堂 OS
            </div>
          </div>
          <h1 className="display-serif mt-5 text-[32px] font-bold leading-[1.2] text-[#F6EFD8] md:text-[44px]">
            这页只回答三件事：这是什么、先去哪、怎么开始。
          </h1>
          <p className="mt-5 max-w-[760px] text-[15px] leading-8 text-[#B8C0DA]">
            朝堂 OS 把一句指令转成可协作的任务流。主入口在王座，深度执行在军机处，正式阅读与汇报在战报库和演示页。
          </p>
        </section>

        {/* Main lines */}
        <Section
          eyebrow="Two Paths · 陛下的两条主线"
          title="绝大多数时候，你只走两条路"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <PathCard
              icon={<Compass size={14} />}
              label="主线 A · 拟旨办事"
              steps={[
                '在王座首页或亲笔朱批页下一道旨',
                '丞相研判并拆成子任务',
                '六部与庄园蜂群并行办理',
                '结果回呈，陛下御批通过即入史馆',
              ]}
            />
            <PathCard
              icon={<Building2 size={14} />}
              label="主线 B · 主动巡视"
              steps={[
                '从王座首页密度板直接进入六部 / 庄园 / 情报 / 任务',
                '看一眼简讯便知近况',
                '值得深入的再进延伸详页',
                '任何时候都可拉钦天监答疑',
              ]}
            />
          </div>
        </Section>

        {/* Terminology */}
        <Section
          eyebrow="Glossary · 官制词汇"
          title="这些词都对应一个具体的 AI 角色或功能"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <TermRow term="朝堂 / 城堡" modern="系统主界面 · 共享基础设施" />
            <TermRow term="王座（Throne）" modern="陛下首页 · 今日第一眼" />
            <TermRow term="大殿（Overview）" modern="完整总览 · 各部奏章汇聚" />
            <TermRow term="军机处（Command Center）" modern="丞相研判中心 · 任务判断 / 拆解 / 分派" />
            <TermRow term="三省审议台（Governance）" modern="起草（中书）· 复核（门下）· 下发（尚书）的治理流" />
            <TermRow term="御巡台（Archive）" modern="巡视六部与蜂群 · 异常 / 浪费摘要" />
            <TermRow term="丞相" modern="中枢调度 AI · 把一句话拆成执行计划" />
            <TermRow term="六部" modern="工 / 兵 / 刑 / 户 / 吏 / 礼 · 常驻执行 agent" />
            <TermRow term="锦衣卫" modern="全球情报 agent · 主动推送风声" />
            <TermRow term="钦天监" modern="未来推演 agent · 多情景预判" />
            <TermRow term="太医院" modern="系统健康监控 · 非主业务" />
            <TermRow term="史官 / 史馆（Scribe）" modern="所有执行历史与复盘的归档" />
            <TermRow term="庄园（Manor）" modern="垂直领域专家军团（律师 / HR / 财务 ...），共 10 座" />
            <TermRow term="蜂群（Swarm）" modern="每庄园内 9 位 agent = 7 专家 + 红队 + 蓝队，三轮对抗出结论" />
            <TermRow term="内侍 · 钦天监" modern="御前侍从 · 解释和引导，任何页面按 ? 召唤" />
          </div>
        </Section>

        {/* Hooks vs Values */}
        <Section
          eyebrow="Shortcuts · 使用技巧"
          title="记住这几个动作就够了"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Shortcut keys="?" desc="任何页面 · 召唤 / 隐藏钦天监" />
            <Shortcut keys="⌘K / Ctrl+K" desc="御令面板 · 全站命令搜索与跳转" />
            <Shortcut keys="⌘Enter" desc="亲笔朱批页 · 一键下旨" />
            <Shortcut keys="Esc" desc="关闭弹层 / drawer / mascot 卡" />
            <Shortcut keys="点击年号" desc="顶部年号 · 切换公历 / 古历" />
            <Shortcut keys="点击密度板 mini" desc="一跳进入对应六部 / 庄园 / 任务 / 情报详页" />
          </div>
        </Section>

        {/* Getting started */}
        <Section
          eyebrow="Start Here · 第一次使用"
          title="第一次使用按这个顺序走"
        >
          <ol className="space-y-3 text-[13px] leading-8 text-[#C8CDD8]">
            <li>
              <span className="mr-2 text-[#F0C66A]">①</span>
              进入王座首页 —— 看今日焦点、锦囊三策、朝堂脉搏，花一分钟对全局有感。
            </li>
            <li>
              <span className="mr-2 text-[#F0C66A]">②</span>
              按 ? 召唤钦天监 —— 他会随机讲 2-3 条科普小贴士，被动了解系统。
            </li>
            <li>
              <span className="mr-2 text-[#F0C66A]">③</span>
              点右上"立即下达新旨"—— 用一句话交代一件事，观察丞相 + 六部如何协作。
            </li>
            <li>
              <span className="mr-2 text-[#F0C66A]">④</span>
              回王座密度板点"庄园"—— 选任一庄园进入，看蜂群的红蓝对抗过程。
            </li>
            <li>
              <span className="mr-2 text-[#F0C66A]">⑤</span>
              最后去复盘台翻一桩旧案 —— 体会朝堂 OS 如何沉淀决策资产。
            </li>
          </ol>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/throne"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#F0C66A]/30 bg-[#F0C66A]/12 px-5 py-2 text-[12px] text-[#F0C66A] transition hover:bg-[#F0C66A]/18"
            >
              <Crown size={13} />
              回到王座
            </Link>
            <Link
              href="/throne/compose"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-5 py-2 text-[12px] text-[#EAEEFB] transition hover:bg-white/5"
            >
              <Sparkles size={13} />
              亲笔下达一旨
            </Link>
            <Link
              href="/manors"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-5 py-2 text-[12px] text-[#EAEEFB] transition hover:bg-white/5"
            >
              <Building2 size={13} />
              巡视庄园
            </Link>
          </div>
        </Section>

        <div className="mt-16 border-t border-white/5 pt-6 text-center text-[10px] uppercase tracking-[0.24em] text-[#6A7299]">
          朝堂 OS · 私人 AI 内阁 · 启元元年
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Sub-components
   ============================================================ */

function Backdrop() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(240,198,106,1) 1px, transparent 1px), linear-gradient(90deg, rgba(240,198,106,1) 1px, transparent 1px)',
          backgroundSize: '120px 120px',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[-160px] h-[360px] bg-[radial-gradient(circle_at_top,rgba(240,198,106,0.12),transparent_60%)]"
      />
    </>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-14">
      <div className="text-[10px] uppercase tracking-[0.24em] text-[#8F835F]">{eyebrow}</div>
      <h2 className="display-serif mt-2 text-[22px] font-semibold text-[#F5E9C9] md:text-[26px]">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function PathCard({
  icon,
  label,
  steps,
}: {
  icon: React.ReactNode;
  label: string;
  steps: string[];
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-5">
      <div className="flex items-center gap-2 text-[#F0C66A]">
        {icon}
        <span className="text-[12px] font-semibold">{label}</span>
      </div>
      <ol className="mt-3 space-y-2 text-[12px] leading-6 text-[#AEB6CF]">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2">
            <span className="shrink-0 text-[#F0C66A]">{i + 1}.</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TermRow({ term, modern }: { term: string; modern: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3">
      <div className="shrink-0 text-[12px] font-semibold text-[#F0C66A]">{term}</div>
      <div className="text-[11px] leading-5 text-[#9AA3C4]">{modern}</div>
    </div>
  );
}

function Shortcut({ keys, desc }: { keys: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3">
      <kbd
        className="shrink-0 rounded-md border border-white/15 bg-black/30 px-2 py-0.5 font-mono text-[11px] text-[#F0C66A]"
      >
        {keys}
      </kbd>
      <span className="text-[11px] text-[#9AA3C4]">{desc}</span>
    </div>
  );
}
