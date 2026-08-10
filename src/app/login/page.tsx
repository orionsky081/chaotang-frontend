'use client';

import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { AuthShell } from '@/features/auth';
import { setSession, decodeJwtExp, type AuthSession } from '@/lib/auth';
import { apiGateway, API_PATHS } from '@/lib/api/gateway';
import { withBasePath } from '@/lib/base-path';

async function loginThroughBackend(username: string, password: string): Promise<AuthSession> {
  const body = await apiGateway.post<{
    token?: string;
    user?: { username?: string };
    tenant?: { id?: number };
    detail?: string;
  }>(API_PATHS.auth.localLogin, { username, password }, { timeoutMs: 20000 });
  if (!body?.token) {
    throw new Error(body?.detail ?? '登录服务暂不可用。');
  }
  return {
    accessToken: body.token,
    tenantId: body.tenant?.id ?? 0,
    username: body.user?.username ?? username,
    expiresAt: decodeJwtExp(body.token) || Date.now() + 8 * 60 * 60 * 1000,
  };
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const next = params.get('next') ?? '/overview';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const user = username.trim();
      const pass = password;
      if (!user || !pass) throw new Error('请填写账号和密码');

      const session = await loginThroughBackend(user, pass);
      setSession(session);
      window.location.assign(withBasePath(next));
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Login"
      title="登入朝堂"
      body="进入大殿查看今日朝堂态势，再前往上书房处理待裁奏折、军机处会审、六部意见和史馆归档。"
      footer={
        <div className="flex items-center justify-between gap-4">
          <div className="text-[12px] leading-6 text-[#9AA3C4]">
            尚无账号？先注册席位。
          </div>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 border border-[#999999] bg-transparent px-3 py-2 text-[12px] font-medium text-[#999999] transition hover:border-white hover:text-white"
            style={{ borderRadius: '4px' }}
          >
            立即注册
            <ArrowRight size={13} />
          </Link>
        </div>
      }
    >
      <form
        onSubmit={onSubmit}
        className="w-full"
      >
        <div className="mb-7">
          <div className="page-eyebrow">CourtOS Entry</div>
          <h2 className="page-title-plain mt-2">账号验证</h2>
          <p className="mt-3 text-[13px] leading-7" style={{ color: '#9AA3C4' }}>
            仅限已注册用户登入
          </p>
        </div>

        <label className="block mb-4">
          <span className="block text-xs mb-1.5" style={{ color: '#9AA3C4' }}>用户名</span>
          <input
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="login-auth-input w-full px-3 py-2.5 text-sm"
            required
          />
        </label>

        <label className="block mb-6">
          <span className="block text-xs mb-1.5" style={{ color: '#9AA3C4' }}>密码</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="login-auth-input w-full px-3 py-2.5 text-sm"
            required
          />
        </label>

        {error && (
          <p className="mb-4 text-sm px-3 py-2" style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: '#F87171', borderRadius: '4px' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full px-4 text-[15px] font-semibold tracking-[0.08em] disabled:opacity-50 transition-all hover:brightness-110"
          style={{
            background: 'linear-gradient(180deg, #D4A017, #FFD700)',
            color: '#333333',
            borderRadius: '4px',
            height: '44px',
          }}
        >
          {submitting ? '验证中…' : '入朝议政'}
        </button>
      </form>
      <style jsx global>{`
        .login-auth-input {
          height: 40px;
          border: 1px solid #333333;
          border-radius: 4px;
          outline: none !important;
          color: #eaeefb;
          caret-color: #f0c66a;
          background: rgba(255,255,255,0.05);
          box-shadow: none;
          transition:
            border-color 180ms ease,
            box-shadow 180ms ease,
            background 180ms ease;
        }
        .login-auth-input:hover {
          border-color: #555555;
          background: rgba(255,255,255,0.06);
        }
        .login-auth-input:focus,
        .login-auth-input:focus-visible {
          border-color: #c9a96e !important;
          outline: none !important;
          box-shadow: none !important;
          background: rgba(255,255,255,0.05);
        }
      `}</style>
    </AuthShell>
  );
}
