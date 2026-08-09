'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setSession, decodeJwtExp, type AuthSession } from '@/lib/auth';
import { ApiError, apiGateway, API_PATHS } from '@/lib/api/gateway';

interface BootstrapResponse {
  data: {
    access_token: string;
    refresh_token: string;
    authorizationSnapshot: {
      account: { id: number; username: string; tenantId: number; accountType: number };
    };
  };
}

export default function OnboardingPage() {
  const router = useRouter();
  const [tenantName, setTenantName] = useState('CourtOS');
  const [username, setUsername] = useState('root');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      if (!tenantName.trim() || tenantName.length > 50) throw new Error('租户名称 1-50 字');
      if (!username.trim()) throw new Error('用户名不能为空');
      if (password.length < 8) throw new Error('密码至少 8 位');

      const body = await apiGateway.post<BootstrapResponse | { message?: string }>(API_PATHS.auth.bootstrap, {
        tenantName: tenantName.trim(),
        username: username.trim(),
        password,
      });
      if (!('data' in body)) {
        throw new Error(body.message ?? '初始化返回无效');
      }
      if (!body.data) {
        throw new Error('初始化返回无效');
      }
      const { access_token, refresh_token, authorizationSnapshot } = body.data;
      const session: AuthSession = {
        accessToken: access_token,
        refreshToken: refresh_token,
        tenantId: authorizationSnapshot.account.tenantId,
        username: authorizationSnapshot.account.username,
        accountType: authorizationSnapshot.account.accountType,
        expiresAt: decodeJwtExp(access_token) || Date.now() + 15 * 60 * 1000,
      };
      setSession(session);
      router.replace('/throne');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError('系统已经初始化过。请直接登录。');
          return;
        }
        const message = (() => {
          try {
            return JSON.parse(err.body).message;
          } catch {
            return null;
          }
        })();
        if (message) {
          setError(message);
          return;
        }
      }
      setError(err instanceof Error ? err.message : '初始化失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: '#04060E' }}>
      <form
        onSubmit={onSubmit}
        className="w-[480px] rounded-2xl px-10 py-12"
        style={{
          background: 'rgba(15,20,40,0.65)',
          border: '1px solid rgba(240,198,106,0.25)',
          backdropFilter: 'blur(20px) saturate(140%)',
          boxShadow: '0 0 0 1px rgba(240,198,106,0.08), 0 30px 80px rgba(0,0,0,0.5)',
        }}
      >
        <div className="mb-8 text-center">
          <p className="text-xs tracking-[0.4em] mb-2" style={{ color: '#8A6A2A' }}>COURTOS · INSTANCE BOOTSTRAP</p>
          <h1 className="display-serif text-3xl gold-text">开国大典</h1>
          <p className="mt-3 text-sm" style={{ color: '#9AA3C4' }}>
            首次启用系统：建立租户实例与超管账号。<br />
            完成后将自动登录至御座。
          </p>
        </div>

        <label className="block mb-4">
          <span className="block text-xs mb-1.5" style={{ color: '#9AA3C4' }}>租户名称</span>
          <input
            type="text"
            value={tenantName}
            onChange={(e) => setTenantName(e.target.value)}
            maxLength={50}
            className="w-full rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-600"
            style={{ background: 'rgba(10,14,30,0.6)', border: '1px solid #1A2142', color: '#EAEEFB' }}
            required
          />
        </label>

        <label className="block mb-4">
          <span className="block text-xs mb-1.5" style={{ color: '#9AA3C4' }}>超管用户名</span>
          <input
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={50}
            className="w-full rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-600"
            style={{ background: 'rgba(10,14,30,0.6)', border: '1px solid #1A2142', color: '#EAEEFB' }}
            required
          />
        </label>

        <label className="block mb-6">
          <span className="block text-xs mb-1.5" style={{ color: '#9AA3C4' }}>超管密码（≥8 位）</span>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            className="w-full rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-600"
            style={{ background: 'rgba(10,14,30,0.6)', border: '1px solid #1A2142', color: '#EAEEFB' }}
            required
          />
        </label>

        {error && (
          <p className="mb-4 text-sm rounded-md px-3 py-2" style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: '#F87171' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg px-4 py-3 text-sm font-semibold tracking-[0.2em] disabled:opacity-50 transition-colors"
          style={{
            background: 'linear-gradient(135deg, #F0C66A, #D4A84B 50%, #8A6A2A)',
            color: '#04060E',
          }}
        >
          {submitting ? '建立中…' : '开国 · 建立实例'}
        </button>

        <p className="mt-4 text-xs text-center" style={{ color: '#6A7299' }}>
          已经初始化过？前往 <a href="/login" style={{ color: '#F0C66A' }}>登录</a>
        </p>
      </form>
    </main>
  );
}
