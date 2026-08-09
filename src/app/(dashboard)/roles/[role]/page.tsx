import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Brain, Building2, Cpu } from 'lucide-react';

import { AUDIENCE_VIEW_LABEL, type AudienceViewRole } from '@/lib/contracts/tenant';

type RolePageConfig = {
  role: AudienceViewRole;
  slug: string;
  title: string;
  tagline: string;
  focus: string[];
  icon: typeof Building2;
  accent: string;
  briefingHref: string;
};

const ROLE_PAGES: Record<string, RolePageConfig> = {
  entrepreneur: {
    role: 'entrepreneur',
    slug: 'entrepreneur',
    title: AUDIENCE_VIEW_LABEL.entrepreneur,
    tagline: '优先呈现经营结论、风险边界和下一步动作。',
    focus: ['一句话结论', '待裁事项', '风险与收益', '下一步负责人'],
    icon: Building2,
    accent: '#F0C66A',
    briefingHref: '/court-briefing?audience=entrepreneur',
  },
  'ai-enthusiast': {
    role: 'ai_enthusiast',
    slug: 'ai-enthusiast',
    title: AUDIENCE_VIEW_LABEL.ai_enthusiast,
    tagline: '保留更多证据解释、流程说明和可追溯依据。',
    focus: ['证据链', '流程解释', '方案对比', '可学习上下文'],
    icon: Brain,
    accent: '#7DD3FC',
    briefingHref: '/court-briefing?audience=ai_enthusiast',
  },
  'ai-geek': {
    role: 'ai_geek',
    slug: 'ai-geek',
    title: AUDIENCE_VIEW_LABEL.ai_geek,
    tagline: '展示质门、分派、运行状态和调试线索。',
    focus: ['模型与工具', '质检门槛', '任务分派', '运行细节'],
    icon: Cpu,
    accent: '#A7F3D0',
    briefingHref: '/court-briefing?audience=ai_geek',
  },
};

export function generateStaticParams() {
  return Object.values(ROLE_PAGES).map((page) => ({ role: page.slug }));
}

export default async function RolePage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const page = ROLE_PAGES[role];
  if (!page) notFound();

  const Icon = page.icon;

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#050812] px-5 py-8 text-[#EAEEFB] md:px-8">
      <section className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-5 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
              <Icon size={22} color={page.accent} aria-hidden />
            </div>
            <p className="section-eyebrow">用户视角</p>
            <h1 className="page-title mt-2">{page.title}</h1>
            <p className="body-copy mt-3">{page.tagline}</p>
          </div>
          <Link
            href={page.briefingHref}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-[12px] font-semibold text-[#061018] transition hover:brightness-110"
            style={{ borderColor: `${page.accent}66`, background: page.accent }}
          >
            进入上书房
            <ArrowRight size={14} aria-hidden />
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          {page.focus.map((item) => (
            <div
              key={item}
              className="rounded-md border px-4 py-3 text-[13px] font-semibold"
              style={{
                borderColor: `${page.accent}30`,
                background: `${page.accent}12`,
                color: '#F5E9C9',
              }}
            >
              {item}
            </div>
          ))}
        </div>

        <section className="rounded-md border border-white/10 bg-white/[0.03] p-5">
          <p className="text-[12px] leading-6 text-[#C6CEE6]">
            这三个角色页面对所有登录租户用户开放。租户只按 tenantId 与成员关系隔离数据；选择或访问某个角色页面不会修改用户身份、权限或数据归属。
          </p>
        </section>
      </section>
    </main>
  );
}
