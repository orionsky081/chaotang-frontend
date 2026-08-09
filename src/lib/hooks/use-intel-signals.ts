'use client';

/**
 * 朝堂 OS · 锦衣卫情报信号 SWR Hook
 *
 * 数据来源：GET /api/frontend/intel/board。
 * 领域归属、证据状态、来源等级与头条选择全部由后端完成。
 */

import useSWR from 'swr';
import type { IntelBoard, IntelBoardSignal } from '@/lib/contracts/intel';
import { API_PATHS, swrFetcher } from '@/lib/api';

export interface UseIntelSignalsResult {
  board: IntelBoard | null;
  signals: IntelBoardSignal[];
  source: string;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  mutate: () => void;
}

/**
 * 获取情报信号列表，支持可选过滤。
 * 每 5 分钟自动刷新，聚焦窗口时立即重新验证。
 */
export function useIntelSignals(): UseIntelSignalsResult {
  const { data, error, isLoading, mutate } = useSWR<IntelBoard, Error>(
    API_PATHS.frontend.intelBoard(80),
    swrFetcher<IntelBoard>,
    {
      refreshInterval: 5 * 60 * 1000, // 5 min
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 30_000,
      onError: (err) => {
        console.warn('[useIntelSignals] fetch error:', err.message);
      },
    },
  );

  return {
    board: data ?? null,
    signals: data?.signals ?? [],
    source: data?.sourceLabel ?? 'UNAVAILABLE',
    isLoading,
    isError: !!error,
    error: error ?? null,
    mutate,
  };
}
