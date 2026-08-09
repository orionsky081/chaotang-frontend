'use client';

/**
 * 丞相今日要务（御前决策压缩器 · 御座左上悬浮）。
 *
 * 数据源：现在合规的后端 BFF —— useSWR(studyBriefing) 走 /api/[...path] 代理到后端 :8081。
 * 旧版直连前端 /api/court/chancellor-advice（callLLM）已随零 DB / 前后端边界迁移删除，不再复建。
 * 诚实分层：后端有 recommendations = LIVE；空/离线 = 待拟，绝不以静态演示冒充真建议。
 */

import useSWR from 'swr';
import Link from 'next/link';
import { API_PATHS, swrFetcher } from '@/lib/api';
import { ResponsibilityNotice } from '@/features/shared/components/ResponsibilityNotice';
import { resolveDadianBriefingState } from '@/features/dadian/lib/live-briefing';

const GOLD = '#F0C66A';

export function ChancellorTodayCard() {
  const { data, error, isLoading, mutate } = useSWR<unknown, Error>(
    API_PATHS.chaotang.studyBriefing,
    swrFetcher<unknown>,
    { revalidateOnFocus: false },
  );

  const state = resolveDadianBriefingState({ data, error, isLoading });
  const recs = state.status === 'ready' ? state.briefing.recommendations : [];

  const headline = recs[0]?.title ?? '';
  const situation = recs[0]?.detail ?? '';
  const reasons = recs.slice(1, 4).map((r) => (r.detail ? `${r.title}：${r.detail}` : r.title));

  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-5 backdrop-blur-sm"
      style={{ borderColor: `${GOLD}33`, background: `linear-gradient(135deg, ${GOLD}10, ${GOLD}04)` }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em]" style={{ color: GOLD }}>
          <span className="text-base leading-none">👑</span> 丞相 · 今日要务
        </div>
        <span
          className="rounded border px-1.5 py-0.5 font-mono text-[9px]"
          style={
            state.status === 'ready'
              ? { borderColor: 'rgba(52,211,153,0.5)', color: '#34D399' }
              : state.status === 'error'
                ? { borderColor: 'rgba(248,113,113,0.5)', color: '#F87171' }
              : { borderColor: 'rgba(240,198,106,0.34)', color: '#BDAA7C' }
          }
        >
          {state.status === 'ready'
            ? '真 · 丞相 LIVE'
            : state.status === 'loading'
              ? '拟旨中…'
              : state.status === 'error'
                ? '暂不可用'
                : '今日无待办'}
        </span>
      </div>

      {state.status === 'ready' ? (
        <>
          <p className="display-serif mt-3 text-[18px] leading-8" style={{ color: '#F5E9C9' }}>
            {headline}
          </p>
          {situation ? (
            <p className="mt-1.5 text-[12px] leading-5 text-[#C6BB9D]">{situation}</p>
          ) : null}
          {reasons.length ? (
            <ul className="mt-2.5 space-y-1">
              {reasons.map((r, i) => (
                <li key={i} className="flex gap-2 text-[12px] leading-5 text-[#C6BB9D]">
                  <span className="mt-0.5 shrink-0 text-[11px]" style={{ color: GOLD }}>{i + 1}</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-3 flex items-center gap-2">
            <Link
              href="/court-briefing"
              className="rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition hover:brightness-110"
              style={{ background: `${GOLD}1c`, border: `1px solid ${GOLD}55`, color: GOLD }}
            >
              下旨详议 →
            </Link>
            <span className="text-[10px] text-[#8A8470]">丞相建议·陛下裁决(采纳/追问/驳回 在上书房)</span>
          </div>
          <ResponsibilityNotice variant="inline" accent={GOLD} />
        </>
      ) : (
        <div className="mt-3 text-[13px] leading-6 text-[#9AA3C4]">
          <p>
            {state.status === 'loading'
              ? '丞相正在读取今日要务…'
              : state.status === 'error'
                ? '朝堂实况暂不可用。引擎恢复后自动呈现真建议，此处不以演示冒充。'
                : '今日暂无待关注要务，可从上书房拟旨。'}
          </p>
          {state.status === 'error' ? (
            <button
              type="button"
              onClick={() => void mutate()}
              className="mt-2 rounded border border-[#F0C66A]/30 px-2.5 py-1 text-[11px] text-[#F0C66A] transition hover:bg-[#F0C66A]/10"
            >
              重新读取
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
