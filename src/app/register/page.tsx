'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AlertCircle, ArrowRight, CheckCircle } from 'lucide-react';
import { AuthShell } from '@/features/auth';
import { ApiError, apiGateway, API_PATHS } from '@/lib/api/gateway';
import { withBasePath } from '@/lib/base-path';

function apiErrorMessage(cause: unknown): string {
  if (cause instanceof ApiError) {
    try {
      const detail = JSON.parse(cause.body) as {
        detail?: string;
        error?: string;
        message?: string;
      };
      return detail?.detail ?? detail?.error ?? detail?.message ?? `后端返回 ${cause.status}`;
    } catch {
      return `后端返回 ${cause.status}`;
    }
  }
  return cause instanceof Error ? cause.message : '注册服务暂时不可用，请稍后重试。';
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const searchParams = useSearchParams();
  const inviteCode = searchParams?.get('invite') ?? '';

  const reduceMotion = useReducedMotion();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const enterInitial = reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 };
  const enterAnimate = { opacity: 1, y: 0 };
  const enterTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.52, ease: [0.22, 1, 0.36, 1] as const };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!username.trim() || !email.trim() || !password.trim() || !confirm.trim()) {
      setError('请先完成所有必填字段。');
      return;
    }
    if (password !== confirm) {
      setError('两次输入的密码不一致。');
      return;
    }
    if (password.length < 6) {
      setError('密码至少需要 6 位。');
      return;
    }
    if (!email.includes('@')) {
      setError('请填写有效的邮箱地址。');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = await apiGateway.post<{
        message?: string;
        username?: string;
        error?: string;
        detail?: string;
      }>(API_PATHS.auth.register, {
          username: username.trim(),
          email: email.trim(),
          password,
          inviteCode: inviteCode || undefined,
      });
      if (!payload || payload.error) {
        setError(payload?.detail ?? payload?.error ?? '注册失败，请稍后重试。');
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      // 携带邀请码跳转登录页
      setTimeout(() => {
        const loginUrl = inviteCode
          ? `/login?next=/overview&invite=${encodeURIComponent(inviteCode)}`
          : '/login';
        window.location.assign(withBasePath(loginUrl));
      }, 2000);
    } catch (cause) {
      setError(apiErrorMessage(cause));
      setSubmitting(false);
    }
  }

  // 注册成功展示
  if (success) {
    return (
      <AuthShell
        eyebrow="Success"
        title="注册成功"
        body="你的席位已建立。即将跳转至登录页，使用注册的账号密码登入朝堂。"
        footer={
          <div className="flex items-center justify-between gap-4">
            <div className="text-[12px] leading-6 text-[#9AA3C4]">
              即将自动跳转登录页…
            </div>
            <Link
              href={inviteCode ? `/login?next=/overview&invite=${encodeURIComponent(inviteCode)}` : '/login'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] font-medium text-[#EAEEFB] transition hover:border-white/15 hover:bg-white/[0.06]"
            >
              立即登录
              <ArrowRight size={13} />
            </Link>
          </div>
        }
      >
        <div className="flex flex-col items-center py-8 text-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, #4ADE80, #166534)',
              boxShadow: '0 0 32px rgba(74,222,128,0.25)',
            }}
          >
            <CheckCircle size={32} className="text-[#04060E]" />
          </div>
          <h3 className="mt-6 text-xl font-bold text-[#F6EFD8]">席位已就绪</h3>
          <p className="mt-2 text-[13px] leading-7 text-[#AEB7D1]">
            请使用 <span className="font-mono text-[#F0C66A]">{username}</span> 登录朝堂。
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Register"
      title="注册新账号"
      body="创建你的朝堂席位，注册后即可登录使用全部功能。"
      footer={
        <div className="flex items-center justify-between gap-4">
          <div className="text-[12px] leading-6 text-[#9AA3C4]">
            已有账号？直接登录进入系统。
          </div>
          <Link
            href={inviteCode ? `/login?invite=${encodeURIComponent(inviteCode)}` : '/login'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] font-medium text-[#EAEEFB] transition hover:border-white/15 hover:bg-white/[0.06]"
          >
            去登录
            <ArrowRight size={13} />
          </Link>
        </div>
      }
    >
      <motion.div
        className="mb-5"
        initial={enterInitial}
        animate={enterAnimate}
        transition={enterTransition}
      >
        <div className="page-eyebrow">Create Account</div>
        <h2 className="page-title-plain mt-2">建立你的朝堂席位</h2>
        <p className="mt-3 text-[13px] leading-7 text-[#AEB7D1]">
          注册后即可登录朝堂 OS，体验 AI 群臣协同工作。
        </p>
      </motion.div>

      {/* 邀请码展示 */}
      {inviteCode && (
        <motion.div
          className="mb-5 rounded-xl border border-[#F0C66A]/25 bg-[#F0C66A]/5 px-4 py-3"
          initial={enterInitial}
          animate={enterAnimate}
          transition={{ ...enterTransition, delay: reduceMotion ? 0 : 0.06 }}
        >
          <p className="text-[11px] tracking-[0.2em] text-[#8A6A2A] mb-1">引荐邀请码</p>
          <p className="text-sm font-mono font-semibold tracking-[0.15em] text-[#F0C66A]">
            {inviteCode}
          </p>
        </motion.div>
      )}

      <motion.form
        className="space-y-4"
        onSubmit={handleSubmit}
        initial={enterInitial}
        animate={enterAnimate}
        transition={{ ...enterTransition, delay: reduceMotion ? 0 : 0.12 }}
      >
        <Field label="用户名" placeholder="2-32 个中英文字符" value={username} onChange={setUsername} autoComplete="username" />
        <Field label="邮箱" placeholder="you@courtos.ai" value={email} onChange={setEmail} autoComplete="email" />
        <Field label="密码" type="password" placeholder="至少 6 位" value={password} onChange={setPassword} autoComplete="new-password" />
        <Field label="确认密码" type="password" placeholder="再次输入密码" value={confirm} onChange={setConfirm} autoComplete="new-password" />

        {error ? (
          <motion.div
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
            className="flex items-start gap-2 rounded-xl border border-[#F43F5E]/25 bg-[#F43F5E]/10 px-3 py-3 text-[12px] leading-6 text-[#F6A5B2]"
          >
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </motion.div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            background: 'linear-gradient(135deg, #F0C66A, #D4A84B)',
            color: '#04060E',
            boxShadow: '0 0 26px rgba(240,198,106,0.28)',
          }}
        >
          {submitting ? '正在注册…' : inviteCode ? '使用引荐码注册' : '注册账号'}
          {!submitting ? <ArrowRight size={14} /> : null}
        </button>
      </motion.form>
    </AuthShell>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[12px] font-medium text-[#F5E9C9]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-xl border border-white/10 bg-[#070B17] px-4 py-3 text-[13px] text-[#EAEEFB] outline-none transition placeholder:text-[#58617F] focus:border-[#F0C66A]/45 focus:bg-[#0A1020]"
      />
    </label>
  );
}
