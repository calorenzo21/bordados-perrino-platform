/**
 * SWR Hook for Client Order Detail
 *
 * Provides client-side caching with:
 * - Instant cache hits on navigation
 * - Background revalidation
 * - Persistent cache between navigations
 */
'use client';

import useSWR from 'swr';

import type { ClientOrderDetail } from '@/lib/services/client-portal.server';

const fetcher = async (url: string): Promise<ClientOrderDetail> => {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Error al cargar el pedido');
  }
  return res.json();
};

interface UseClientOrderOptions {
  fallbackData?: ClientOrderDetail;
}

export function useClientOrder(orderId: string, options: UseClientOrderOptions = {}) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<ClientOrderDetail>(
    orderId ? `/api/client/orders/${orderId}` : null,
    fetcher,
    {
      fallbackData: options.fallbackData,
      dedupingInterval: 15000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      revalidateIfStale: true,
      keepPreviousData: true,
      errorRetryCount: 2,
      errorRetryInterval: 3000,
    }
  );

  return {
    order: data,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}
