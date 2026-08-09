'use client';

/**
 * /more — 次级功能集合页（L2 索引）
 *
 * 主导航只露 L1 黄金路径（朝堂 / 下旨 / 任务 / 史馆）。
 * 业务深度场景的入口都在这里 — 用户偶尔进，知道"还有什么"。
 *
 * 5 类分组：决策 / 执行 / 情报 / 存档 / 专署
 * 每条目带 1 行功能介绍。
 */

import Link from 'next/link';
import {
  Landmark,
  ScrollText,
  Shield,
  Building2,
  Telescope,
  Radar,
  BookOpen,
  Heart,
  Sparkles,
  Users,
  Network,
  Activity,
  ArrowRight,
} from 'lucide-react';

interface Entry {
  href: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
}

interface Group {
  eyebrow: string;
  title: string;
  desc: string;
  items: Entry[];
}

const GROUPS: Group[] = [
  {
    eyebrow: 'L2 · Decision',
    title: '决策层 · 看局势 / 起任务 / 拍板',
    desc: '陛下需要看全貌、形成正式任务、走会签拍板时来这里。',
    items: [
      {
        href: '/overview',
        label: '大殿',
        desc: '全朝一眼断 — 4 段：丞相主建议 + 朝堂脉搏 TOP3 + 11 大臣卡牌 + 实况 event feed。',
        icon: <Landmark size={16} />,
      },
      {
        href: '/command-center',
        label: '军机处',
        desc: '密旨输入台 — 当局势复杂、需要丞相先压缩问题再下发时进入。',
        icon: <ScrollText size={16} />,
      },
      {
        href: '/governance',
        label: '三省审议台',
        desc: '中书 / 门下 / 尚书三省走会签流程，最后陛下盖玺。',
        icon: <Shield size={16} />,
      },
      {
        href: '/command-center?view=council',
        label: '三省合议',
        desc: '三省议事场 — 看丞相、刑部、户部等当面对话讨论一件事。',
        icon: <Shield size={16} />,
      },
    ],
  },
  {
    eyebrow: 'L2 · Execution',
    title: '执行层 · 看人 / 看场景 / 看蜂群',
    desc: '任务下发后，从「人」「场景」「机器」三个角度看在做什么。',
    items: [
      {
        href: '/manors',
        label: '六部专署 · 立柱大厅',
        desc: '11 agent（中枢 2 + 六部 6 + 专署 3）当前状态盘 — 看「人」视角。',
        icon: <Users size={16} />,
      },
      {
        href: '/manors',
        label: '十一庄园 · 俯瞰',
        desc: '10 业务庄园（法务/HR/财务/合规/营销等）执行盘 — 看「场景」视角。',
        icon: <Building2 size={16} />,
      },
      {
        href: '/manors',
        label: '庄园蜂群主页',
        desc: '庄园是当前最新蜂群主页，用一张图看业务战场和蜂群调度。',
        icon: <Network size={16} />,
      },
    ],
  },
  {
    eyebrow: 'L2 · Intelligence',
    title: '情报层 · 看远方 / 看天气 / 看星象',
    desc: '提前看见趋势、急报、推演 — 用情报决定下一道旨。',
    items: [
      {
        href: '/intel',
        label: '锦衣卫情报',
        desc: '全球地图 hero · 4 级信号（critical/warning/watch/info）路由到部门 — 政策 / 舆情 / 地缘 / 监管。',
        icon: <Radar size={16} />,
      },
      {
        href: '/forecast',
        label: '观天台 · 钦天监',
        desc: '夜景观星视觉 · 6 tab：群策 / 玄机 / 星象 / 天气 / 沙盘 — 3 情景推演带概率与预案。',
        icon: <Telescope size={16} />,
      },
    ],
  },
  {
    eyebrow: 'L2 · Archive',
    title: '存档层 · 看历史的三个层级',
    desc: '不同抽象层级回看已发生的事 — 任务级 / 案例级 / 史书级 / 文件级。',
    items: [
      {
        href: '/throne/pulse',
        label: '朝堂脉搏',
        desc: '今日全貌 4 数：待御批 / 执行中 / 急报 / 已录史馆 + 实时滚条 — 不替你决策。',
        icon: <Activity size={16} />,
      },
      {
        href: '/archive',
        label: '史馆 · 任务级归档',
        desc: '陛下批过的旨意按月分组归档 — 可搜索过往奏报。',
        icon: <BookOpen size={16} />,
      },
      {
        href: '/scribe',
        label: '复盘台 · 案例级反思',
        desc: '单任务事后复盘 + 教训提炼 + 召回检索 — 史官 agent 自动产出。',
        icon: <BookOpen size={16} />,
      },
      {
        href: '/shiguan',
        label: '太史令总档 · 史书级',
        desc: '长期治理案例库 + 模式识别 — 跨任务找规律。',
        icon: <BookOpen size={16} />,
      },
      {
        href: '/reports',
        label: '战报库 · 文件级',
        desc: '可下载、可分享、可复用的报告文件 — 不是数据库视图。',
        icon: <ScrollText size={16} />,
      },
    ],
  },
  {
    eyebrow: 'L2 · Special',
    title: '专署 / 试验 · 主路径之外的场景',
    desc: '朝堂大殿之外的专门场所，各自有独立场景与气味。',
    items: [
      {
        href: '/health',
        label: '太医院',
        desc: '个人健康主题 6 tab：体检 / 日常 / 医讯 / 资源 / 急救 — 不是组织健康诊断。',
        icon: <Heart size={16} />,
      },
      {
        href: '/libu',
        label: '御书房（卷宗书架）',
        desc: '经史子集分类卷宗 + 全文检索 — 知识库与档案，不是吏部人事。',
        icon: <BookOpen size={16} />,
      },
      {
        href: '/hanlin',
        label: '翰林院（苏轼当值）',
        desc: '太子研判台 + AI 洞察 + 候选池 + 实验沙盘 — 人才孵化与试验场。',
        icon: <Sparkles size={16} />,
      },
    ],
  },
];

export default function MorePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#04060E]">
      <div className="hidden md:block">
        <div className="relative z-10 mx-auto max-w-[1320px] px-6 pb-16 pt-8 md:px-10 md:pt-10">
          {/* Header */}
          <header className="flex flex-wrap items-center justify-between gap-3 pb-2">
            <div>
              <div
                className="text-[11px] uppercase tracking-[0.32em]"
                style={{ color: '#8F835F', fontFamily: 'JetBrains Mono, monospace' }}
              >
                COURTOS · L2 INDEX
              </div>
              <h1
                className="display-serif mt-2 text-[28px] font-bold leading-[1.2] md:text-[36px]"
                style={{ color: '#F5E9C9' }}
              >
                朝堂还有什么
              </h1>
              <p className="mt-3 max-w-[760px] text-[14px] leading-7" style={{ color: '#9AA3C4' }}>
                此页是次级功能索引 — 主路径之外的所有业务深度入口。
                陛下偶尔来此巡视 / 深探 / 切换场景，不必常驻。
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] transition hover:border-white/20"
                style={{ color: '#C8CDD8' }}
              >
                后院 / 平台运维 →
              </Link>
              <Link
                href="/throne"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] transition hover:border-white/20"
                style={{ color: '#C8CDD8' }}
              >
                ← 返朝堂
              </Link>
            </div>
          </header>

          {/* 5 个分组 */}
          <div className="mt-10 space-y-10">
            {GROUPS.map((g) => (
              <section key={g.eyebrow}>
                <div className="mb-4">
                  <div
                    className="text-[10px] uppercase tracking-[0.24em]"
                    style={{ color: '#8F835F', fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {g.eyebrow}
                  </div>
                  <h2
                    className="mt-1 text-[20px] font-semibold"
                    style={{ fontFamily: '"Noto Serif SC", serif', color: '#F5E9C9' }}
                  >
                    {g.title}
                  </h2>
                  <p className="mt-1 text-[12px] leading-6" style={{ color: '#9AA3C4' }}>
                    {g.desc}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {g.items.map((entry) => (
                    <Link
                      key={entry.href}
                      href={entry.href}
                      className="group relative overflow-hidden rounded-2xl border bg-white/[0.03] px-5 py-4 backdrop-blur-xl transition hover:border-[#F0C66A]/25"
                      style={{
                        borderColor: 'rgba(255,255,255,0.08)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span style={{ color: '#F0C66A' }}>{entry.icon}</span>
                          <span
                            className="text-[14px] font-semibold"
                            style={{ fontFamily: '"Noto Serif SC", serif', color: '#F5E9C9' }}
                          >
                            {entry.label}
                          </span>
                        </div>
                      </div>

                      <p className="mt-3 text-[12px] leading-6" style={{ color: '#B6BDD5' }}>
                        {entry.desc}
                      </p>

                      <div
                        className="mt-3 inline-flex items-center gap-1 text-[11px] transition group-hover:translate-x-0.5"
                        style={{ color: '#F0C66A' }}
                      >
                        进入
                        <ArrowRight size={11} />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* 底部说明 */}
          <div
            className="mt-12 rounded-2xl border px-5 py-4 text-[12px] leading-7"
            style={{
              borderColor: '#1A2142',
              background: 'rgba(15,20,40,0.5)',
              color: '#9AA3C4',
            }}
          >
            <strong style={{ color: '#F0C66A', fontFamily: '"Noto Serif SC", serif' }}>
              关于本页
            </strong>
            <span className="ml-2">
              此页是 CourtOS 当前皮肤（朝堂）下的次级功能索引。未来加入「董事会皮肤」「宇宙星系皮肤」时，
              核心引擎不变，本页的词汇与视觉会换皮 — 决策 / 执行 / 情报 / 存档 / 专署 这 5 个分类是产品骨架。
            </span>
          </div>
        </div>
      </div>

      {/* Mobile gate */}
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center md:hidden">
        <div className="text-[14px]" style={{ color: '#C8CDD8' }}>
          此页针对桌面端优化，请在电脑上查看
        </div>
      </div>
    </div>
  );
}
