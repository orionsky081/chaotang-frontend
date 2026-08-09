/**
 * 丞相台 · /prime → /court-briefing（收敛合一，铁律3）
 *
 * 旧 /prime 是丞相职责的第二套实现：任务看板(/tasks/board)、六部协同
 * (/departments/coordination)、下旨(/prime-minister/dispatch) 三个口全部经
 * 浏览器请求只走同源 JSON REST，由唯一 BFF 转发到 FastAPI。它与上书房
 * ChancellorColumn 构成铁律3 双轨——上书房才是真闭环丞相(走 /api/court/* + 主库 tasks + jiqun)。
 *
 * 故 /prime 收敛重定向到正牌丞相工位 /court-briefing(上书房)，删掉打死后端的旁路，
 * 不再自建第二套丞相 runtime(铁律13.2 #9)。如需独立任务看板，应作为上书房的一个视图实现，
 * 而非另起一套打向不存在后端的页面。
 */

import { redirect } from 'next/navigation';

export default async function PrimePage({
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
