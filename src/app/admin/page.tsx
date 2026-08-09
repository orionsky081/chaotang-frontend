/**
 * /admin — 系统管理聚合页（L3 索引）· server component + SSR 守门
 *
 * /more 是业务功能 L2 索引；/admin 是平台运维 L3 索引。
 * 收集所有不属于业务主路径的零散页面：设置 / 文档 / 试验 / 平台。
 *
 * SSR 守门来源：courtos.access_token cookie（lib/auth.ts setSession 写入）。
 * 服务端解码 JWT 取 accountType — < 1（NORMAL）或缺失则直接渲染 splash，
 * 避免 client gate 的"核验中"闪烁与未授权时的空壳泄露。
 */

import Link from 'next/link';
import {
  Settings,
  ScrollText,
  Info,
  BookOpen,
  PlayCircle,
  Palette,
  ArrowRight,
} from 'lucide-react';
import { readSession } from '@/lib/auth-server';
import { AdminSplash } from '@/components/admin-splash';

interface Entry {
  href: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
  status?: 'ready' | 'wip' | 'demo' | 'soon';
}

interface Group {
  eyebrow: string;
  title: string;
  desc: string;
  items: Entry[];
}

const GROUPS: Group[] = [
  {
    eyebrow: 'L3 · System',
    title: '系统设置',
    desc: '租户配置、审计追溯、权限管理 — 平台运维进入。',
    items: [
      {
        href: '/settings',
        label: '设置中心',
        desc: '租户基本信息 / 通知 / 接入 / 计费 — 平台级配置主入口。',
        icon: <Settings size={16} />,
        status: 'ready',
      },
      {
        href: '/settings/audit',
        label: '审计日志',
        desc: '谁在什么时候改了什么 — 可搜索的全平台行为记录。',
        icon: <ScrollText size={16} />,
        status: 'ready',
      },
      {
        href: '/admin/jiqun-depts',
        label: '蜂群部门访问',
        desc: '管理部门、给部门授权可访问的蜂群、把用户分配到部门 — 接 jiqun_ai backend。',
        icon: <Settings size={16} />,
        status: 'ready',
      },
    ],
  },
  {
    eyebrow: 'L3 · Docs',
    title: '文档与说明',
    desc: '产品定位、术语对照、使用指南 — 第一次来或忘了功能时进入。',
    items: [
      {
        href: '/about',
        label: '关于 CourtOS',
        desc: '产品定位与核心价值 — 企业 AI 法务治理系统的差异化。',
        icon: <Info size={16} />,
        status: 'ready',
      },
      {
        href: '/guide',
        label: '使用指南',
        desc: '主路径 / 术语对照 / 钩子说明 / 快捷键 — 主界面不再重复解释。',
        icon: <BookOpen size={16} />,
        status: 'ready',
      },
    ],
  },
  {
    eyebrow: 'L3 · Lab',
    title: '试验与演示',
    desc: '路演剧本、特性试验、皮肤切换 — 主路径之外的实验场。',
    items: [
      {
        href: '/demo',
        label: '路演控制台',
        desc: '预录剧本一键播放 — /overview 与 /command-center 实时点亮，对外演示用。',
        icon: <PlayCircle size={16} />,
        status: 'demo',
      },
      {
        href: '/admin/skin',
        label: '皮肤切换（即将上线）',
        desc: '朝堂 / 董事会 / 宇宙星系 — 同一引擎切换 IP 皮肤，词汇与视觉随之换。',
        icon: <Palette size={16} />,
        status: 'soon',
      },
    ],
  },
];

const STATUS_BADGE: Record<NonNullable<Entry['status']>, { label: string; color: string; bg: string }> = {
  ready: { label: '已通', color: '#3DD68C', bg: 'rgba(61,214,140,0.12)' },
  wip: { label: '在跑', color: '#F0C66A', bg: 'rgba(240,198,106,0.12)' },
  demo: { label: 'DEMO', color: '#9AA3C4', bg: 'rgba(154,163,196,0.12)' },
  soon: { label: '即将', color: '#6BA0FF', bg: 'rgba(107,160,255,0.12)' },
};

export default async function AdminPage() {
  // 管理员判定改用 readSession().isAdmin（= role==='admin'，真实后端 claim）。
  // 旧 `accountType<1` 对真实后端 token(无 accountType)恒 true → 真实 admin 被锁死
  // （安全复核 Finding 5）。
  const session = await readSession();
  if (!session) {
    return <AdminSplash kind="unauthenticated" />;
  }
  if (!session.isAdmin) {
    return <AdminSplash kind="forbidden" />;
  }
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
                COURTOS · L3 ADMIN
              </div>
              <h1
                className="display-serif mt-2 text-[28px] font-bold leading-[1.2] md:text-[36px]"
                style={{ color: '#F5E9C9' }}
              >
                后院 · 平台运维
              </h1>
              <p className="mt-3 max-w-[760px] text-[14px] leading-7" style={{ color: '#9AA3C4' }}>
                此页是平台运维索引 — 业务主路径之外的设置、文档、试验聚合于此。
                陛下偶尔来此调御，不必常驻。
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/more"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] transition hover:border-white/20"
                style={{ color: '#C8CDD8' }}
              >
                业务索引 →
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

          {/* 3 个分组 */}
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
                  {g.items.map((entry) => {
                    const isSoon = entry.status === 'soon';
                    const className =
                      'group relative overflow-hidden rounded-2xl border bg-white/[0.03] px-5 py-4 backdrop-blur-xl transition' +
                      (isSoon
                        ? ' cursor-not-allowed opacity-60'
                        : ' hover:border-[#F0C66A]/25');
                    const inner = (
                      <>
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
                          {entry.status && (
                            <span
                              className="rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider"
                              style={{
                                background: STATUS_BADGE[entry.status].bg,
                                color: STATUS_BADGE[entry.status].color,
                                fontFamily: 'JetBrains Mono, monospace',
                              }}
                            >
                              {STATUS_BADGE[entry.status].label}
                            </span>
                          )}
                        </div>

                        <p className="mt-3 text-[12px] leading-6" style={{ color: '#B6BDD5' }}>
                          {entry.desc}
                        </p>

                        {!isSoon && (
                          <div
                            className="mt-3 inline-flex items-center gap-1 text-[11px] transition group-hover:translate-x-0.5"
                            style={{ color: '#F0C66A' }}
                          >
                            进入
                            <ArrowRight size={11} />
                          </div>
                        )}
                      </>
                    );
                    return isSoon ? (
                      <div
                        key={entry.href}
                        className={className}
                        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                        aria-disabled="true"
                      >
                        {inner}
                      </div>
                    ) : (
                      <Link
                        key={entry.href}
                        href={entry.href}
                        className={className}
                        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                      >
                        {inner}
                      </Link>
                    );
                  })}
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
              业务索引在 <Link href="/more" className="underline" style={{ color: '#F0C66A' }}>/more</Link>，
              这里是平台层面入口 — 设置 / 文档 / 试验。皮肤切换是后续 IP 扩展（董事会、宇宙星系）的开关位。
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
