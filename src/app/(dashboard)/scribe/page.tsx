/** 史馆：只展示后端归档与御批记录。 */
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Archive, BookOpen, RefreshCw, Search, ScrollText } from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { DeptIdentityStrip } from '@/features/shared/components/dept-identity-strip';
import { chaotang } from '@/lib/api/clients/chaotang';
import type { MemorialBrief, ReviewAction } from '@/lib/contracts/memorial';

interface ArchiveView {
  memorials: MemorialBrief[];
  decisions: ReviewAction[];
}

export default function ScribePage() {
  const [query, setQuery] = useState('');
  const { data, error, isLoading, mutate } = useSWR<ArchiveView, Error>(
    'scribe-backend-archive',
    () => chaotang.archive(),
    { revalidateOnFocus: false },
  );
  const memorials = data?.memorials ?? [];
  const decisions = data?.decisions ?? [];
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return memorials;
    return memorials.filter((item) =>
      `${item.title}\n${item.summary ?? ''}`.toLocaleLowerCase().includes(normalized),
    );
  }, [memorials, query]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[1400px] space-y-5 p-6">
        <DeptIdentityStrip
          portrait="/heroes/character-roster/scribe-sima-qian.webp"
          name="太史令 · 司马迁"
          tagline="奏折、裁决与复盘均从后端归档读取，史官只如实记录"
          accent="#F0C66A"
        />
        <GlassPanel variant="gold" tone="deep" padding="lg" hudCorners>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="page-eyebrow">SHIGUAN · BACKEND ARCHIVE</div>
              <h1 className="page-title mt-2">史馆归档</h1>
              <p className="body-copy mt-2 max-w-2xl">
                奏折、裁决与复盘均从后端归档读取；前端不再生成案例、教训或相似召回。
              </p>
            </div>
            <button
              type="button"
              onClick={() => void mutate()}
              className="flex items-center gap-2 rounded-md border border-[#F0C66A]/30 px-3 py-2 text-[11px] text-[#F0C66A]"
            >
              <RefreshCw size={13} /> 刷新后端档案
            </button>
          </div>
        </GlassPanel>

        <div className="grid gap-4 md:grid-cols-3">
          <Metric icon={<Archive size={15} />} label="已归档奏折" value={memorials.length} />
          <Metric icon={<ScrollText size={15} />} label="御批记录" value={decisions.length} />
          <Metric icon={<BookOpen size={15} />} label="当前命中" value={visible.length} />
        </div>

        <GlassPanel tone="deep" padding="md">
          <div className="flex items-center gap-3">
            <Search size={14} className="text-[#F0C66A]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="按标题或摘要筛选后端档案"
              className="flex-1 bg-transparent text-[13px] text-[#F5E9C9] outline-none placeholder:text-[#6A7299]"
            />
          </div>
        </GlassPanel>

        {isLoading ? <Status copy="正在翻阅后端档案…" /> : null}
        {error ? <Status copy={`后端档案不可读：${error.message}`} danger /> : null}
        {!isLoading && !error && visible.length === 0 ? <Status copy="后端尚无符合条件的归档。" /> : null}

        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((item) => (
            <GlassPanel key={item.id} tone="elevated" padding="md">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="section-eyebrow">{item.sourceDepartment ?? '史馆'}</div>
                  <h2 className="section-title mt-2 truncate">{item.title}</h2>
                </div>
                <span className="rounded border border-[#3DD68C]/25 px-2 py-1 text-[10px] text-[#3DD68C]">
                  {item.status}
                </span>
              </div>
              <p className="body-copy mt-3 line-clamp-3">{item.summary || '后端未提供摘要'}</p>
              <div className="mt-4 flex items-center justify-between text-[10px] text-[#8A92AC]">
                <span>{item.createdAt || '时间未知'}</span>
                <Link href={`/throne/memorials/${encodeURIComponent(item.id)}`} className="text-[#F0C66A]">
                  查看奏折
                </Link>
              </div>
            </GlassPanel>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <GlassPanel tone="elevated" padding="md">
      <div className="flex items-center gap-2 text-[#F0C66A]">{icon}<span className="text-[11px]">{label}</span></div>
      <div className="mt-3 font-mono text-2xl font-bold text-[#F5E9C9]">{value}</div>
    </GlassPanel>
  );
}

function Status({ copy, danger = false }: { copy: string; danger?: boolean }) {
  return (
    <GlassPanel tone="deep" padding="md">
      <div className={danger ? 'text-[12px] text-[#F58B8B]' : 'text-[12px] text-[#8A92AC]'}>{copy}</div>
    </GlassPanel>
  );
}
