'use client';

import useSWR from 'swr';
import { API_PATHS, swrFetcher } from '@/lib/api';

interface BackendHealth {
  status: string;
  version: string;
  checks: Record<string, string>;
  details?: Record<string, Record<string, unknown>>;
}

const CHECK_LABELS: Record<string, string> = {
  mcp_web_search: '网络检索服务',
  litellm: '模型网关',
  deepseek_key: '模型凭据',
};

function checkTone(value: string): { color: string; label: string } {
  if (value === 'up' || value === 'configured' || value === 'ok') {
    return { color: '#3DD68C', label: '正常' };
  }
  if (value === 'missing') return { color: '#E0B450', label: '未配置' };
  return { color: '#E5484D', label: value || '异常' };
}

export function SystemVitals() {
  const { data, error, isLoading, mutate } = useSWR<BackendHealth, Error>(
    API_PATHS.system.health,
    swrFetcher<BackendHealth>,
    { refreshInterval: 30_000 },
  );

  return (
    <div className="mx-auto max-w-[560px]">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <div className="page-eyebrow">Backend Health · 后端事实</div>
          <h1 className="display-serif mt-1 text-[20px] text-[#F5E9C9]">系统体征</h1>
        </div>
        <button
          type="button"
          onClick={() => void mutate()}
          className="rounded-[8px] border px-2.5 py-1 text-[11px] text-[#b6ab8c] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#F0C66A]"
          style={{ borderColor: '#F0C66A33' }}
        >
          立即刷新
        </button>
      </div>

      {isLoading ? <StatusMessage>正在读取后端健康检查…</StatusMessage> : null}
      {error ? <StatusMessage danger>后端健康接口不可达：{error.message}</StatusMessage> : null}

      {data ? (
        <>
          <div className="mb-2 rounded-[10px] border border-white/10 bg-white/[0.025] px-3.5 py-3 text-[12px] text-[#E9DDBE]">
            后端总状态：
            <span className="ml-2 font-semibold" style={{ color: data.status === 'ok' ? '#3DD68C' : '#E0B450' }}>
              {data.status}
            </span>
            <span className="ml-2 text-[#6a7080]">版本 {data.version}</span>
          </div>
          <div className="space-y-2">
            {Object.entries(data.checks).map(([key, value]) => {
              const tone = checkTone(value);
              const latency = data.details?.[key]?.latency_ms;
              return (
                <div key={key} className="flex items-center justify-between rounded-[10px] border border-white/[0.05] bg-[rgba(6,8,14,0.4)] px-3.5 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: tone.color, boxShadow: `0 0 8px ${tone.color}66` }} />
                    <span className="text-[12.5px] text-[#E9DDBE]">{CHECK_LABELS[key] ?? key}</span>
                  </div>
                  <span className="text-[11px]" style={{ color: tone.color }}>
                    {tone.label}
                    {typeof latency === 'number' ? <span className="ml-2 text-[#6a7080]">{latency} ms</span> : null}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}

function StatusMessage({ children, danger = false }: { children: React.ReactNode; danger?: boolean }) {
  return (
    <div className="rounded-[10px] border px-3.5 py-3 text-[12px]" style={{ borderColor: danger ? '#E5484D44' : '#ffffff12', color: danger ? '#E5484D' : '#9AA3C4' }}>
      {children}
    </div>
  );
}
