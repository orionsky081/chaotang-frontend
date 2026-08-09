/**
 * 上书房 · /study → /court-briefing（两路由合一）
 *
 * 历史上 /study 与 /court-briefing 都渲染同一个 ShangshufangPage（重复），
 * 且 routes.ts 曾把二者登记成两种从未兑现的体验。合一后 /court-briefing 为正牌
 * （showInNav、PRD 模块、整条登录漏斗的落点），/study 仅做规范化重定向。
 *
 * 子路由 /study/[officialCode] 也仅作兼容重定向；前端不再生成官员档案、
 * 奏折草稿或版本历史。
 */

import { redirect } from 'next/navigation';

export default async function StudyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (Array.isArray(value)) value.forEach((v) => qs.append(key, v));
    else if (value != null) qs.set(key, value);
  }
  const query = qs.toString();
  redirect(query ? `/court-briefing?${query}` : '/court-briefing');
}
