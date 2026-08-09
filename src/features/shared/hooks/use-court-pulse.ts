'use client';

import useSWR from 'swr';
import { API_PATHS, swrFetcher } from '@/lib/api';

export interface CourtPulse {
  pendingReviews: number;
  criticalSignals: number;
  warningSignals: number;
  runningTasks: number;
  archivedTasks: number;
  totalTasks: number;
  totalSignals: number;
  hasEmergency: boolean;
  loading: boolean;
  source: 'backend' | 'unavailable';
}

type BackendCourtPulse = Omit<CourtPulse, 'loading' | 'source'> & { source: 'backend' };

const UNAVAILABLE: CourtPulse = {
  pendingReviews: 0,
  criticalSignals: 0,
  warningSignals: 0,
  runningTasks: 0,
  archivedTasks: 0,
  totalTasks: 0,
  totalSignals: 0,
  hasEmergency: false,
  loading: false,
  source: 'unavailable',
};

/** 全局计数和紧急态均由后端聚合；浏览器只负责轮询和展示。 */
export function useCourtPulse(enabled = true): CourtPulse {
  const { data, isLoading } = useSWR<BackendCourtPulse, Error>(
    enabled ? API_PATHS.frontend.courtPulse : null,
    swrFetcher<BackendCourtPulse>,
    { refreshInterval: 3_000 },
  );
  if (data) return { ...data, loading: false };
  return { ...UNAVAILABLE, loading: enabled && isLoading };
}
