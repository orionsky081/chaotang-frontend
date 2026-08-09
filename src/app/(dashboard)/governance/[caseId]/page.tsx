'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { BillTimeline } from '@/features/governance';
import { swrFetcher } from '@/lib/api';
import type { Bill } from '@/lib/contracts/governance';

export default function GovernanceCaseDetailPage() {
  const params = useParams<{ caseId: string }>();
  const caseId = params?.caseId;
  const { data, error, isLoading, mutate } = useSWR<Bill, Error>(
    caseId ? `/api/frontend/governance/bills/${encodeURIComponent(caseId)}` : null,
    swrFetcher<Bill>,
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[1400px] space-y-6 p-6">
        <GlassPanel variant="gold" tone="deep" padding="lg" hudCorners glow>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="page-eyebrow">治理单案 · Backend Record</div>
              <h1 className="page-title mt-3">{data?.title ?? '治理案卷'}</h1>
              <p className="body-copy mt-4 max-w-[72ch]">
                {data?.command ?? '正在从后端主库读取案卷。'}
              </p>
            </div>
            <Link href="/governance" className="inline-flex items-center gap-2 rounded-full border border-[#F0C66A]/35 bg-[#F0C66A]/12 px-4 py-2 text-[11px] text-[#F0C66A]">
              <ArrowLeft size={13} />
              回治理流
            </Link>
          </div>
        </GlassPanel>

        {isLoading && (
          <GlassPanel tone="elevated" padding="lg">
            <div className="py-12 text-center text-[12px] text-[#9AA3C4]">正在读取后端案卷…</div>
          </GlassPanel>
        )}

        {error && (
          <GlassPanel tone="elevated" padding="lg">
            <div className="text-[13px] text-[#F6A5B2]">案卷读取失败：{error.message}</div>
            <button type="button" onClick={() => void mutate()} className="mt-4 rounded-full border border-white/10 px-4 py-2 text-[11px] text-[#EAEEFB]">
              重试
            </button>
          </GlassPanel>
        )}

        {data && (
          <>
            <GlassPanel variant="gold" tone="elevated" padding="lg" hudCorners>
              <BillTimeline bill={data} />
            </GlassPanel>
            <GlassPanel variant="gold" tone="elevated" padding="md">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-[#A78BFA]">
                <ShieldCheck size={14} />
                当前合法动作由后端状态机返回
              </div>
              <div className="mt-3 text-[12px] leading-6 text-[#9AA3C4]">
                {data.allowedTransitions.length > 0
                  ? data.allowedTransitions.map((item) => `${item.type}（${item.actor}）`).join(' · ')
                  : '终态，无后续合法动作。'}
              </div>
            </GlassPanel>
          </>
        )}
      </div>
    </div>
  );
}
