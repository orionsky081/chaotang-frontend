'use client';

import useSWR from 'swr';
import { apiGateway, API_PATHS } from '@/lib/api/gateway';

type LiveStatus = 'live' | 'missing';
interface PowerDepartment {
  code: string;
  name: string;
  status: LiveStatus;
  hasEngine?: boolean;
  hasRealData?: boolean;
  swarmId?: string | null;
  blocker?: string | null;
}
interface PowerStatus {
  workingScore: string;
  liveCount: number;
  blockedCount: number;
  total: number;
  departments: PowerDepartment[];
}

const STATUS_COLOR: Record<LiveStatus, string> = { live: '#5FB97A', missing: '#E5604D' };
const STATUS_LABEL: Record<LiveStatus, string> = { live: '后端已注册', missing: '后端未注册' };

async function fetchPowerStatus(): Promise<PowerStatus> {
  return apiGateway.get<PowerStatus>(API_PATHS.frontend.powerStatus, { headers: { 'Cache-Control': 'no-store' } });
}

export default function PowerDashboardPage() {
  const { data, error, isLoading } = useSWR<PowerStatus>(
    API_PATHS.frontend.powerStatus,
    fetchPowerStatus,
    { refreshInterval: 30_000 },
  );

  return (
    <main style={{ minHeight: '100vh', background: '#04060E', padding: '48px 24px 80px', color: '#EAEEFB' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <header style={{ marginBottom: 36 }}>
          <div className="page-eyebrow" style={{ marginBottom: 10 }}>CHAOTANG · BACKEND POWER STATUS</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
            <span className="display-serif" style={{ fontSize: 64, fontWeight: 700, lineHeight: 1, color: '#F0C66A' }}>
              {data?.workingScore ?? '—'}
            </span>
            <span className="display-serif" style={{ fontSize: 22, color: '#FBF7EC' }}>后端蜂群已注册</span>
          </div>
          <p className="body-copy" style={{ marginTop: 12, color: error ? '#E5604D' : '#9AA3C4' }}>
            {error ? '后端状态暂不可用。' : isLoading ? '正在读取 FastAPI 注册表…' : `已注册 ${data?.liveCount ?? 0} · 待接 ${data?.blockedCount ?? 0}`}
          </p>
          <div style={{ marginTop: 16, height: 8, borderRadius: 999, background: '#12182E', overflow: 'hidden' }}>
            <div style={{ width: data?.total ? `${(data.liveCount / data.total) * 100}%` : '0%', height: '100%', background: STATUS_COLOR.live }} />
          </div>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(data?.departments ?? []).map((department) => (
            <div key={department.code} style={{ display: 'grid', gridTemplateColumns: '4px 96px 1fr auto', gap: 16, alignItems: 'center', padding: '14px 18px', borderRadius: 12, border: '1px solid #1A2142', background: 'linear-gradient(180deg,#0A0E1E 0%,#0B1020 100%)' }}>
              <div style={{ alignSelf: 'stretch', borderRadius: 4, background: STATUS_COLOR[department.status] }} />
              <div className="display-serif" style={{ fontSize: 18, color: '#FBF7EC' }}>{department.name}</div>
              <div className="body-copy" style={{ fontSize: 12, color: '#9AA3C4' }}>
                {department.blocker ?? (department.swarmId ? `蜂群 ${department.swarmId}` : '后端执行能力已登记')}
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 600, padding: '5px 11px', borderRadius: 999, color: STATUS_COLOR[department.status], background: `${STATUS_COLOR[department.status]}1a`, border: `1px solid ${STATUS_COLOR[department.status]}44`, whiteSpace: 'nowrap' }}>
                ● {STATUS_LABEL[department.status]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
