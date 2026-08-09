'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { BookOpenCheck, FilePlus2, FlaskConical, PackageCheck, Trophy } from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { swrFetcher } from '@/lib/api';
import { API_PATHS } from '@/lib/api/gateway';

interface Contribution {
  id: string;
  title: string;
  type: string;
  summary: string;
  authorName: string;
  status: string;
  originalityClaim: string;
  applicationHint: string;
  createdAt: string;
}

interface HanlinOverview {
  summary: {
    currentAwardCycle: string | null;
    submittedContributions: number;
    rankedContributions: number;
    activeCandidates: number;
    incubatingModules: number;
    exportableModules: number;
  };
  contributions: Contribution[];
  reviews: unknown[];
  recommendations: unknown[];
  experiments: unknown[];
  awards: unknown[];
  projects: unknown[];
  candidates: unknown[];
  modules: unknown[];
  offerings: unknown[];
}

export function HanlinHomePage() {
  const { data, error } = useSWR<HanlinOverview, Error>(
    API_PATHS.frontend.hanlinOverview,
    swrFetcher<HanlinOverview>,
  );
  const summary = data?.summary;

  return (
    <main className="h-full overflow-y-auto bg-[#050712] px-5 py-6">
      <div className="mx-auto max-w-[1480px]">
        <header className="rounded-xl border border-[#F0C66A]/22 bg-[#080B15]/85 px-5 py-5">
          <div className="page-eyebrow">HANLIN · BACKEND KNOWLEDGE INTAKE</div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="page-title">翰林院</h1>
              <p className="body-copy mt-2 max-w-[760px]">贡献身份、状态、评审、奖励与商品化数据均由后端持有；本页不再加载演示奖榜或浏览器角色权限。</p>
            </div>
            <Link href="/hanlin/contribute" className="inline-flex items-center gap-2 rounded-full border border-[#F0C66A]/35 bg-[#F0C66A]/10 px-4 py-2 text-[12px] text-[#F0C66A]">
              <FilePlus2 size={13} /> 提交贡献
            </Link>
          </div>
        </header>

        {error && <div className="mt-4 rounded-xl border border-[#F43F5E]/25 bg-[#F43F5E]/10 px-4 py-3 text-[12px] text-[#F6A5B2]">后端翰林院读取失败：{error.message}</div>}

        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric icon={<BookOpenCheck size={14} />} label="贡献" value={summary?.submittedContributions} />
          <Metric icon={<Trophy size={14} />} label="已评审" value={summary?.rankedContributions} />
          <Metric icon={<FlaskConical size={14} />} label="候选" value={summary?.activeCandidates} />
          <Metric icon={<PackageCheck size={14} />} label="孵化模块" value={summary?.incubatingModules} />
          <Metric icon={<PackageCheck size={14} />} label="可输出" value={summary?.exportableModules} />
        </section>

        <GlassPanel variant="gold" tone="elevated" padding="lg" className="mt-5">
          <div className="flex items-center justify-between gap-3"><h2 className="section-title">后端贡献库</h2><span className="text-[10px] text-[#8F98B8]">{data?.contributions.length ?? 0} 件</span></div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data?.contributions.length ? data.contributions.map((item) => (
              <article key={item.id} className="rounded-xl border border-white/8 bg-black/25 px-3 py-3">
                <div className="flex items-start justify-between gap-2"><h3 className="text-[13px] font-semibold text-[#F5E9C9]">{item.title}</h3><span className="shrink-0 text-[9px] text-[#F0C66A]">{item.status}</span></div>
                <p className="mt-2 text-[11px] leading-6 text-[#B8C0DA]">{item.summary}</p>
                <div className="mt-3 text-[9px] text-[#7D88A4]">{item.authorName} · {item.type} · {item.createdAt}</div>
              </article>
            )) : <div className="col-span-full rounded-xl border border-dashed border-white/10 px-4 py-14 text-center text-[11px] text-[#8F98B8]">后端尚无贡献记录。</div>}
          </div>
        </GlassPanel>
      </div>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value?: number }) {
  return <div className="rounded-xl border border-[#F0C66A]/14 bg-[#080B15]/75 px-4 py-3"><div className="flex items-center gap-2 text-[10px] text-[#8F835F]">{icon}{label}</div><div className="mt-2 text-[22px] font-semibold text-[#F5E9C9]">{value ?? '—'}</div></div>;
}
