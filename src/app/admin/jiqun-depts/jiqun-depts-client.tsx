'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Lock, Users, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { API_PATHS } from '@/lib/api/gateway';

interface Dept {
  id: number;
  name: string;
  created_at?: string;
}
interface UserRow {
  id: number;
  username: string;
  display_name?: string;
  role: string;
  tenant_name?: string;
}

const ADMIN_API_BASE = API_PATHS.admin.base;

async function jq<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase();
  const body = (() => {
    if (!init || init.body === undefined) return undefined;
    if (typeof init.body === 'string') {
      try {
        return JSON.parse(init.body);
      } catch {
        return init.body;
      }
    }
    return init.body;
  })();
  const endpoint = `${ADMIN_API_BASE}${path}`;
  if (method === 'GET') {
    return api.get<T>(endpoint);
  }
  if (method === 'POST') {
    return api.post<T>(endpoint, body);
  }
  if (method === 'PUT') {
    return api.put<T>(endpoint, body);
  }
  if (method === 'PATCH') {
    return api.patch<T>(endpoint, body);
  }
  if (method === 'DELETE') {
    return api.del<T>(endpoint);
  }
  throw new Error(`Unsupported method: ${method}`);
}

// ─── Hooks ────────────────────────────────────────────────────────────────

function useDepts() {
  const [depts, setDepts] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDepts(await jq<Dept[]>('/admin/depts'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { depts, loading, error, reload };
}

function useUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const reload = useCallback(async () => {
    try {
      setUsers(await jq<UserRow[]>('/admin/users'));
    } catch {
      /* silent */
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { users, reload };
}

function useAllFlows() {
  const [flows, setFlows] = useState<string[]>([]);
  useEffect(() => {
    jq<string[]>('/admin/flows')
      .then(setFlows)
      .catch(() => setFlows([]));
  }, []);
  return flows;
}

// ─── Modals ───────────────────────────────────────────────────────────────

function DeptNameModal({
  initial,
  title,
  onClose,
  onSave,
}: {
  initial?: string;
  title: string;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(initial ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <ModalShell title={title} onClose={onClose}>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="部门名称"
        className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#F0C66A]/60"
      />
      {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
        >
          取消
        </button>
        <button
          disabled={!name.trim() || busy}
          onClick={async () => {
            setBusy(true);
            setErr(null);
            try {
              await onSave(name.trim());
              onClose();
            } catch (e) {
              setErr((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
          className="gold-text rounded border border-[#F0C66A]/40 px-3 py-1.5 text-xs hover:bg-[#F0C66A]/10 disabled:opacity-40"
        >
          {busy ? '保存中…' : '保存'}
        </button>
      </div>
    </ModalShell>
  );
}

function FlowAccessModal({
  dept,
  allFlows,
  onClose,
  onSaved,
}: {
  dept: Dept;
  allFlows: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    jq<string[]>(`/admin/depts/${dept.id}/flows`)
      .then((list) => setPicked(new Set(list)))
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false));
  }, [dept.id]);

  const toggle = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <ModalShell
      title={`授权"${dept.name}"可访问的蜂群`}
      width="640px"
      onClose={onClose}
    >
      {loading ? (
        <div className="flex h-32 items-center justify-center text-white/40">
          <Loader2 size={16} className="mr-2 animate-spin" /> 加载中…
        </div>
      ) : (
        <>
          <div className="mb-3 text-[11px] text-white/40">
            勾选的蜂群对该部门可见，未勾选的部门成员看不到。共 {allFlows.length} 个，已选{' '}
            {picked.size} 个。
          </div>
          <div className="grid max-h-[50vh] grid-cols-2 gap-1 overflow-auto rounded border border-white/5 bg-black/30 p-2">
            {allFlows.map((f) => {
              const checked = picked.has(f);
              return (
                <label
                  key={f}
                  className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs transition ${
                    checked
                      ? 'bg-[#F0C66A]/10 text-white'
                      : 'text-white/60 hover:bg-white/5'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(f)}
                    className="accent-[#F0C66A]"
                  />
                  <span className="truncate">{f.replace(/^flow_|\.yaml$/g, '')}</span>
                </label>
              );
            })}
          </div>
          {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
            >
              取消
            </button>
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setErr(null);
                try {
                  await jq(`/admin/depts/${dept.id}/flows`, {
                    method: 'PUT',
                    body: JSON.stringify({ flow_ids: [...picked] }),
                  });
                  onSaved();
                  onClose();
                } catch (e) {
                  setErr((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
              className="gold-text rounded border border-[#F0C66A]/40 px-3 py-1.5 text-xs hover:bg-[#F0C66A]/10 disabled:opacity-40"
            >
              {busy ? '保存中…' : `保存（${picked.size}）`}
            </button>
          </div>
        </>
      )}
    </ModalShell>
  );
}

function UserDeptsModal({
  user,
  allDepts,
  onClose,
  onSaved,
}: {
  user: UserRow;
  allDepts: Dept[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    jq<{ id: number; name: string }[]>(`/admin/users/${user.id}/depts`)
      .then((list) => setPicked(new Set(list.map((d) => d.id))))
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false));
  }, [user.id]);

  return (
    <ModalShell
      title={`分配"${user.display_name || user.username}"的部门`}
      onClose={onClose}
    >
      {loading ? (
        <div className="flex h-24 items-center justify-center text-white/40">
          <Loader2 size={16} className="mr-2 animate-spin" /> 加载中…
        </div>
      ) : (
        <>
          <div className="mb-3 text-[11px] text-white/40">
            一个用户可属多个部门，可访问的蜂群是各部门授权的并集。
          </div>
          <div className="flex max-h-[40vh] flex-col gap-1 overflow-auto rounded border border-white/5 bg-black/30 p-2">
            {allDepts.length === 0 && (
              <div className="px-2 py-3 text-xs text-white/30">
                还没有部门，先去上方建几个。
              </div>
            )}
            {allDepts.map((d) => {
              const checked = picked.has(d.id);
              return (
                <label
                  key={d.id}
                  className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs transition ${
                    checked
                      ? 'bg-[#F0C66A]/10 text-white'
                      : 'text-white/60 hover:bg-white/5'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setPicked((prev) => {
                        const next = new Set(prev);
                        next.has(d.id) ? next.delete(d.id) : next.add(d.id);
                        return next;
                      })
                    }
                    className="accent-[#F0C66A]"
                  />
                  <span>{d.name}</span>
                </label>
              );
            })}
          </div>
          {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
            >
              取消
            </button>
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setErr(null);
                try {
                  await jq(`/admin/users/${user.id}/depts`, {
                    method: 'PUT',
                    body: JSON.stringify({ dept_ids: [...picked] }),
                  });
                  onSaved();
                  onClose();
                } catch (e) {
                  setErr((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
              className="gold-text rounded border border-[#F0C66A]/40 px-3 py-1.5 text-xs hover:bg-[#F0C66A]/10 disabled:opacity-40"
            >
              {busy ? '保存中…' : `保存（${picked.size}）`}
            </button>
          </div>
        </>
      )}
    </ModalShell>
  );
}

function ModalShell({
  title,
  width = '420px',
  onClose,
  children,
}: {
  title: string;
  width?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="rounded-lg border border-white/10 bg-[#0A0E1A] p-5 shadow-2xl"
        style={{ width, maxWidth: '92vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-sm font-medium text-white">{title}</h3>
        {children}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────

export default function JiqunDeptsClient() {
  const { depts, loading, error, reload } = useDepts();
  const { users, reload: reloadUsers } = useUsers();
  const allFlows = useAllFlows();

  const [createOpen, setCreateOpen] = useState(false);
  const [renaming, setRenaming] = useState<Dept | null>(null);
  const [flowEditing, setFlowEditing] = useState<Dept | null>(null);
  const [userEditing, setUserEditing] = useState<UserRow | null>(null);

  // dept_id → flow count (lazy-load on demand; for table 计数只显一个 hint)
  const [flowCounts, setFlowCounts] = useState<Record<number, number>>({});
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      depts.map((d) =>
        jq<string[]>(`/admin/depts/${d.id}/flows`)
          .then((l) => [d.id, l.length] as const)
          .catch(() => [d.id, 0] as const),
      ),
    ).then((pairs) => {
      if (cancelled) return;
      setFlowCounts(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, [depts]);

  const userCounts = useMemo(() => {
    const m: Record<number, number> = {};
    return m; // 简化：每行不展示 user count，需要时打开 modal 看
  }, []);
  void userCounts;

  return (
    <>
      {/* Section: Departments */}
      <section className="mb-10">
        <header className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-medium text-white">部门</h2>
            <p className="text-[11px] text-white/40">
              一个部门一行，"配蜂群"决定该部门成员能在 follow_jiqun_ui 里看到哪些蜂群。
            </p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="gold-text inline-flex items-center gap-1 rounded border border-[#F0C66A]/40 px-3 py-1.5 text-xs hover:bg-[#F0C66A]/10"
          >
            <Plus size={13} /> 新建部门
          </button>
        </header>

        <div className="overflow-hidden rounded-lg border border-white/5 bg-[#0A0E1A]/60">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-[11px] uppercase text-white/40">
              <tr>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">名称</th>
                <th className="px-4 py-2 text-left">已授权蜂群</th>
                <th className="px-4 py-2 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-white/40">
                    <Loader2 size={14} className="mx-auto animate-spin" />
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-red-400">
                    加载失败：{error}
                  </td>
                </tr>
              )}
              {!loading && !error && depts.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-white/40">
                    还没建任何部门
                  </td>
                </tr>
              )}
              {depts.map((d) => (
                <tr
                  key={d.id}
                  className="border-t border-white/5 text-white/80 hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-2 text-white/40">{d.id}</td>
                  <td className="px-4 py-2 font-medium text-white">{d.name}</td>
                  <td className="px-4 py-2 text-white/60">
                    {flowCounts[d.id] ?? '…'} 个
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => setFlowEditing(d)}
                        className="rounded p-1.5 text-white/50 hover:bg-white/5 hover:text-[#F0C66A]"
                        title="配蜂群"
                      >
                        <Lock size={13} />
                      </button>
                      <button
                        onClick={() => setRenaming(d)}
                        className="rounded p-1.5 text-white/50 hover:bg-white/5 hover:text-[#F0C66A]"
                        title="改名"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`确定删除部门"${d.name}"？`)) return;
                          try {
                            await jq(`/admin/depts/${d.id}`, { method: 'DELETE' });
                            void reload();
                          } catch (e) {
                            alert((e as Error).message);
                          }
                        }}
                        className="rounded p-1.5 text-white/50 hover:bg-red-500/10 hover:text-red-400"
                        title="删除"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section: Users → Depts */}
      <section>
        <header className="mb-3">
          <h2 className="text-base font-medium text-white">用户的部门归属</h2>
          <p className="text-[11px] text-white/40">
            点"分部门"为用户多选所属部门，用户能访问的蜂群 = 其所有部门授权的并集。
          </p>
        </header>

        <div className="overflow-hidden rounded-lg border border-white/5 bg-[#0A0E1A]/60">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-[11px] uppercase text-white/40">
              <tr>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">用户名</th>
                <th className="px-4 py-2 text-left">显示名</th>
                <th className="px-4 py-2 text-left">角色</th>
                <th className="px-4 py-2 text-left">租户</th>
                <th className="px-4 py-2 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-white/40">
                    没有用户（用 jiqun_ai /api/admin/users POST 建一个）
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-t border-white/5 text-white/80 hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-2 text-white/40">{u.id}</td>
                  <td className="px-4 py-2 font-medium text-white">{u.username}</td>
                  <td className="px-4 py-2 text-white/60">{u.display_name || '—'}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] ${
                        u.role === 'admin'
                          ? 'bg-[#F0C66A]/15 text-[#F0C66A]'
                          : 'bg-white/5 text-white/60'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-white/60">{u.tenant_name || '—'}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => setUserEditing(u)}
                      className="inline-flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-xs text-white/70 hover:border-[#F0C66A]/40 hover:text-[#F0C66A]"
                    >
                      <Users size={12} /> 分部门
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modals */}
      {createOpen && (
        <DeptNameModal
          title="新建部门"
          onClose={() => setCreateOpen(false)}
          onSave={async (name) => {
            await jq('/admin/depts', {
              method: 'POST',
              body: JSON.stringify({ name }),
            });
            void reload();
          }}
        />
      )}
      {renaming && (
        <DeptNameModal
          title={`重命名"${renaming.name}"`}
          initial={renaming.name}
          onClose={() => setRenaming(null)}
          onSave={async (name) => {
            await jq(`/admin/depts/${renaming.id}`, {
              method: 'PUT',
              body: JSON.stringify({ name }),
            });
            void reload();
          }}
        />
      )}
      {flowEditing && (
        <FlowAccessModal
          dept={flowEditing}
          allFlows={allFlows}
          onClose={() => setFlowEditing(null)}
          onSaved={reload}
        />
      )}
      {userEditing && (
        <UserDeptsModal
          user={userEditing}
          allDepts={depts}
          onClose={() => setUserEditing(null)}
          onSaved={reloadUsers}
        />
      )}
    </>
  );
}
