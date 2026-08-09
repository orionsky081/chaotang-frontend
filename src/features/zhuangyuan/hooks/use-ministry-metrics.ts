'use client';

import useSWR from 'swr';
import { API_PATHS, swrFetcher } from '@/lib/api';
import type { ManorMinistryMetricsMap } from '@/lib/contracts/manor';

export function useMinistryMetrics() {
  return useSWR<ManorMinistryMetricsMap>(
    API_PATHS.frontend.manorMetrics,
    swrFetcher<ManorMinistryMetricsMap>,
    { refreshInterval: 60_000, revalidateOnFocus: true },
  );
}
