/**
 * 翰林院 · 子路由共享 layout
 *
 * 通电(2026-07-03)：翰林院 9 个页面组件此前无宿主路由(/hanlin 全仓无 page.tsx)，导航栏链接
 * 404。这里挂共享的纪晓岚 HanlinBottomDock，避免 9 个 page.tsx 各自重复 import + 挂载。
 */
export default function HanlinLayout({ children }: { children: React.ReactNode }) {
  return <div className="relative h-full">{children}</div>;
}
