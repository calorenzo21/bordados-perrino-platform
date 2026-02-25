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
  const res = await fetch(url, { cache: 'no-store' });
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
      dedupingInterval: 30000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      revalidateIfStale: true,
      keepPreviousData: true,
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
