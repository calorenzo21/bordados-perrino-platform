/**
 * SWR Hook for Client Panel Data
 *
 * Provides client-side caching with:
 * - Instant cache hits on navigation
 * - Background revalidation
 * - Persistent cache between navigations
 */
'use client';

import useSWR from 'swr';

import type { ClientPanelData } from '@/lib/services/client-portal.server';

const fetcher = async (url: string): Promise<ClientPanelData> => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Error al cargar los datos');
  }
  return res.json();
};

export function useClientPanel() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<ClientPanelData>(
    '/api/client/panel',
    fetcher,
    {
      // Keep data in cache - this is key for instant navigation
      dedupingInterval: 60000, // 1 minute deduping
      revalidateOnFocus: false, // Don't refetch on window focus
      revalidateOnReconnect: true, // Refetch on reconnect
      // Show stale data while revalidating (instant navigation)
      revalidateIfStale: true,
      // Keep previous data while loading new
      keepPreviousData: true,
      // Retry on error
      errorRetryCount: 2,
      errorRetryInterval: 3000,
    }
  );

  return {
    data,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}
