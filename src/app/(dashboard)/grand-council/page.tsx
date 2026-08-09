import { redirect } from 'next/navigation';

/**
 * 军机处路由收敛（2026-07-03）：
 * /grand-council → 308 永久重定向到 /command-center?view=council
 *
 * 军机处所有功能已合并到 /command-center 一个入口，通过 ?view= 参数切换视图。
 * 旧 /grand-council 不再作为独立路由维护。
 */
export default function GrandCouncilRedirect() {
  redirect('/command-center?view=council');
}
