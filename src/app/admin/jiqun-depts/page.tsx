/**
 * /admin/jiqun-depts — 蜂群部门访问控制管理页（server shell + 客户端 CRUD）
 *
 * SSR 守门：复用与 /admin 同样的逻辑（readSession().isAdmin = role==='admin'）。
 * 数据交互通过 /api/admin/* 服务端 proxy 转发到 jiqun_ai backend。
 */
import { readSession } from '@/lib/auth-server';
import { AdminSplash } from '@/components/admin-splash';
import JiqunDeptsClient from './jiqun-depts-client';

export const dynamic = 'force-dynamic';

export default async function Page() {
  // 改用 role-based isAdmin；旧 accountType<1 对真实后端 admin 恒拒（Finding 5）。
  const session = await readSession();
  if (!session) return <AdminSplash kind="unauthenticated" />;
  if (!session.isAdmin) return <AdminSplash kind="forbidden" />;

  return (
    <div className="min-h-screen bg-[#04060E] px-6 py-8 md:px-10 md:py-10">
      <div className="mx-auto max-w-[1320px]">
        <p className="page-eyebrow mb-2">L3 · System / 蜂群权限</p>
        <h1 className="page-title mb-1">蜂群部门访问控制</h1>
        <p className="page-meta mb-8">
          管理部门、给部门授权可访问的蜂群、把用户分配到部门 — 数据走
          <code className="mx-1 rounded bg-white/5 px-1 py-0.5 text-[11px]">
            /api/admin/*
          </code>
          代理到 jiqun_ai backend。
        </p>
        <JiqunDeptsClient />
      </div>
    </div>
  );
}
