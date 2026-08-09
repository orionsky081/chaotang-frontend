'use client';

import useSWR from 'swr';
import {
  Activity,
  CalendarCheck,
  HeartPulse,
  RefreshCw,
  Server,
  ShieldAlert,
  Stethoscope,
} from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { PageHeaderShell } from '@/components/PageHeaderShell';
import { DeptIdentityStrip } from '@/features/shared/components/dept-identity-strip';
import { API_PATHS, swrFetcher } from '@/lib/api';
import {
  formatHealthRiskLevel,
  type HealthMetric,
  type HealthProfile,
  type HealthRiskLevel,
  type MetricStatus,
} from '@/types/health';

const RISK_COLOR: Record<HealthRiskLevel, string> = {
  normal: '#3DD68C',
  watch: '#F0C66A',
  warning: '#F5A524',
  danger: '#F43F5E',
};

const METRIC_LABEL: Record<MetricStatus, string> = {
  normal: '正常',
  borderline: '临界',
  abnormal_high: '偏高',
  abnormal_low: '偏低',
};

const METRIC_COLOR: Record<MetricStatus, string> = {
  normal: '#3DD68C',
  borderline: '#F0C66A',
  abnormal_high: '#F5A524',
  abnormal_low: '#60A5FA',
};

function MetricCard({ metric }: { metric: HealthMetric }) {
  const tone = METRIC_COLOR[metric.status];
  return (
    <div className="rounded-lg border bg-black/20 p-3" style={{ borderColor: `${tone}45` }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] tracking-wider text-white/35">{metric.code}</div>
          <div className="mt-1 text-sm text-[#E7DDBF]">{metric.name}</div>
        </div>
        <span className="rounded px-2 py-1 text-[10px]" style={{ color: tone, background: `${tone}14` }}>
          {METRIC_LABEL[metric.status]}
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="font-mono text-2xl" style={{ color: tone }}>{metric.value}</span>
        <span className="text-xs text-white/35">{metric.unit}</span>
      </div>
      <div className="mt-2 text-[10px] text-white/35">参考范围：{metric.referenceRange}</div>
      {metric.trend && <div className="mt-1 text-[10px] text-white/35">趋势：{metric.trend}</div>}
    </div>
  );
}

export default function HealthCenterPage() {
  const { data: profile, error, isLoading, mutate } = useSWR<HealthProfile>(
    API_PATHS.frontend.healthProfile,
    swrFetcher<HealthProfile>,
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1500px] px-4 py-6 md:px-7">
      <DeptIdentityStrip
        portrait="/heroes/character-roster/health-li-shizhen.webp"
        name="太医令 · 李时珍"
        tagline="评分、风险与就诊建议均来自后端健康档案，太医院只如实呈现"
        accent="#3DD68C"
      />
      <PageHeaderShell
        title="太医院 · 健康档案"
        subtitle="评分、风险等级、指标状态、干预和就诊建议均来自后端健康档案；前端不诊断、不推荐专家、不计算治疗方案。"
        breadcrumbs={[{ label: '朝堂', href: '/throne' }, { label: '太医院' }]}
        actions={(
          <button
            type="button"
            onClick={() => void mutate()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-md border border-[#3DD68C]/35 bg-[#3DD68C]/10 px-3 py-2 text-xs text-[#3DD68C] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            刷新后端档案
          </button>
        )}
      />

      {isLoading && !profile && (
        <GlassPanel className="flex min-h-72 items-center justify-center" variant="success">
          <div className="text-center">
            <HeartPulse className="mx-auto h-8 w-8 animate-pulse text-[#3DD68C]" />
            <p className="mt-3 text-sm text-white/50">正在读取后端健康档案…</p>
          </div>
        </GlassPanel>
      )}

      {error && !profile && (
        <GlassPanel className="flex min-h-72 items-center justify-center" variant="danger">
          <div className="max-w-md text-center">
            <p className="text-sm text-[#F5E9C9]">后端健康档案暂不可用</p>
            <p className="mt-2 text-xs leading-6 text-white/40">{error.message}</p>
            <button
              type="button"
              onClick={() => void mutate()}
              className="mt-4 rounded-md border border-white/15 px-3 py-2 text-xs text-white/60"
            >
              重试
            </button>
          </div>
        </GlassPanel>
      )}

      {profile && (
        <div className="space-y-5">
          <section className="grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
            <GlassPanel variant="success" hudCorners glow>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="section-eyebrow">后端健康总览</div>
                  <div className="mt-3 text-lg font-semibold text-[#F5E9C9]">{profile.subjectName}</div>
                  <div className="mt-1 text-xs text-white/35">更新于 {profile.updatedAt}</div>
                </div>
                <HeartPulse className="h-6 w-6 text-[#3DD68C]" />
              </div>
              <div className="mt-6 flex items-end justify-between">
                <div>
                  <span className="font-mono text-5xl" style={{ color: RISK_COLOR[profile.riskLevel] }}>
                    {profile.totalScore}
                  </span>
                  <span className="ml-1 text-sm text-white/35">/ 100</span>
                </div>
                <span
                  className="rounded-full border px-3 py-1.5 text-xs"
                  style={{ color: RISK_COLOR[profile.riskLevel], borderColor: `${RISK_COLOR[profile.riskLevel]}55` }}
                >
                  {formatHealthRiskLevel(profile.riskLevel)}
                </span>
              </div>
            </GlassPanel>

            <GlassPanel>
              <div className="flex items-center gap-2 text-xs text-white/45">
                <Server className="h-4 w-4 text-[#6BA0FF]" />
                数据边界
              </div>
              <p className="mt-3 text-sm leading-7 text-[#D8CDAF]">
                页面只展示后端返回的档案字段。风险等级、指标状态、干预动作、就诊科室与随访时间均不在浏览器内推导。
              </p>
            </GlassPanel>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <GlassPanel>
              <div className="mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#3DD68C]" />
                <h2 className="section-title">体检指标</h2>
              </div>
              {profile.metrics.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {profile.metrics.map((metric) => <MetricCard key={metric.code} metric={metric} />)}
                </div>
              ) : (
                <p className="text-sm text-white/40">后端暂未返回体检指标。</p>
              )}
            </GlassPanel>

            <GlassPanel variant={profile.alerts.length ? 'danger' : 'default'}>
              <div className="mb-4 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-[#F5A524]" />
                <h2 className="section-title">健康提示</h2>
              </div>
              {profile.alerts.length > 0 ? (
                <div className="space-y-3">
                  {profile.alerts.map((alert) => (
                    <div key={alert.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm font-semibold text-[#F5E9C9]">{alert.title}</div>
                        <span className="text-[10px]" style={{ color: RISK_COLOR[alert.level] }}>
                          {formatHealthRiskLevel(alert.level)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-6 text-white/50">{alert.description}</p>
                      {alert.actionRequired && <div className="mt-2 text-[10px] text-[#F5A524]">后端标记：需要行动</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/40">后端当前未返回健康提示。</p>
              )}
            </GlassPanel>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <GlassPanel>
              <div className="mb-4 flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-[#3DD68C]" />
                <h2 className="section-title">干预计划</h2>
              </div>
              <div className="space-y-3">
                {profile.interventions.map((plan) => (
                  <div key={plan.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <div className="text-sm font-semibold text-[#F5E9C9]">{plan.title}</div>
                    <div className="mt-1 text-[10px] text-white/35">{plan.scheduledAt} · {plan.durationDays} 天</div>
                    <ul className="mt-3 space-y-2">
                      {plan.actions.map((action) => (
                        <li key={action.id} className="text-xs leading-5 text-white/55">
                          {action.description} · {action.status}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {profile.interventions.length === 0 && <p className="text-sm text-white/40">后端暂未返回干预计划。</p>}
              </div>
            </GlassPanel>

            <GlassPanel>
              <div className="mb-4 flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-[#60A5FA]" />
                <h2 className="section-title">就诊建议</h2>
              </div>
              <div className="space-y-3">
                {profile.visitRecommendations.map((item) => (
                  <div key={item.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <div className="text-sm font-semibold text-[#F5E9C9]">{item.department} · {item.specialty}</div>
                    <p className="mt-2 text-xs leading-6 text-white/50">{item.reason}</p>
                    <div className="mt-2 text-[10px]" style={{ color: RISK_COLOR[item.urgency] }}>
                      {formatHealthRiskLevel(item.urgency)} · {item.suggestedWithinDays} 天内
                    </div>
                  </div>
                ))}
                {profile.visitRecommendations.length === 0 && <p className="text-sm text-white/40">后端暂未返回就诊建议。</p>}
              </div>
            </GlassPanel>

            <GlassPanel>
              <div className="mb-4 flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-[#F0C66A]" />
                <h2 className="section-title">随访提醒</h2>
              </div>
              <div className="space-y-3">
                {profile.followups.map((item) => (
                  <div key={item.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <div className="text-sm text-[#F5E9C9]">{item.title}</div>
                    <div className="mt-2 text-xs text-white/45">{item.dueAt}</div>
                    <div className="mt-1 text-[10px] text-[#F0C66A]">{item.completed ? '后端状态：已完成' : '后端状态：待完成'}</div>
                  </div>
                ))}
                {profile.followups.length === 0 && <p className="text-sm text-white/40">后端暂未返回随访提醒。</p>}
              </div>
            </GlassPanel>
          </section>
        </div>
      )}
    </main>
  );
}
