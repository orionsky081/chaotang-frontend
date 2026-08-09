'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Loader2 } from 'lucide-react'
import { GlassPanel } from '@/components/ui/glass-panel'
import { apiGateway, API_PATHS } from '@/lib/api/gateway';

function NewGovernanceCaseForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [title, setTitle] = useState('')
  const [command, setCommand] = useState(searchParams?.get('command') ?? '')
  // submitting is a write state, not data — AsyncState not applicable here
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !command.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const data = await apiGateway.post<{ id: string }>(API_PATHS.frontend.governanceBills, {
        title: title.trim(),
        command: command.trim(),
      });
      router.push(`/governance/${data.id}`)
    } catch {
      setError('创建议案失败，请重试')
      setSubmitting(false)
    }
  }

  return (
    <GlassPanel tone="elevated" padding="lg">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        <div>
          <label className="mb-2 block text-[12px] font-medium text-[#F5E9C9]">议案标题</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例：Q2增长战略审议"
            className="w-full rounded-xl border border-white/10 bg-[#070B17] px-4 py-3 text-[13px] text-[#EAEEFB] outline-none placeholder:text-[#58617F] focus:border-[#F0C66A]/45"
          />
        </div>
        <div>
          <label className="mb-2 block text-[12px] font-medium text-[#F5E9C9]">皇帝口谕</label>
          <textarea
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="详细描述你的指令或想要解决的问题..."
            rows={5}
            className="w-full resize-none rounded-xl border border-white/10 bg-[#070B17] px-4 py-3 text-[13px] text-[#EAEEFB] outline-none placeholder:text-[#58617F] focus:border-[#F0C66A]/45"
          />
        </div>
        {error && (
          <div className="rounded-xl border border-[#F43F5E]/25 bg-[#F43F5E]/10 px-3 py-3 text-[12px] text-[#F6A5B2]">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={submitting || !title.trim() || !command.trim()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-semibold transition disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #F0C66A, #D4A84B)', color: '#04060E' }}
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
          {submitting ? '正在提呈…' : '提呈三省审议'}
          {!submitting && <ArrowRight size={14} />}
        </button>
      </form>
    </GlassPanel>
  )
}

export default function NewGovernanceCasePage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[860px] space-y-6 p-6">
        <GlassPanel variant="gold" tone="deep" padding="lg">
          <div className="page-eyebrow">New Governance Case · 新建议案</div>
          <h1 className="mt-3 text-[28px] font-semibold text-[#F6EFD8]">向三省提呈议案</h1>
          <p className="mt-3 text-[13px] leading-7 text-[#B6BDD5]">
            填写议案标题与皇帝口谕，系统将自动开启中书省起草流程。
          </p>
        </GlassPanel>

        <Suspense
          fallback={
            <GlassPanel tone="elevated" padding="lg">
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin text-[#F0C66A]" />
              </div>
            </GlassPanel>
          }
        >
          <NewGovernanceCaseForm />
        </Suspense>
      </div>
    </div>
  )
}
