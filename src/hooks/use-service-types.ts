'use client';

import useSWR from 'swr';

import { createClient } from '@/lib/supabase/browser';

export interface ServiceType {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string;
  isActive: boolean;
  displayOrder: number;
}

const SERVICE_TYPES_KEY = 'service-types-active' as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapServiceType(st: any): ServiceType {
  return {
    id: st.id,
    name: st.name,
    description: st.description,
    icon: st.icon,
    color: st.color,
    isActive: st.is_active,
    displayOrder: st.display_order,
  };
}

async function fetchServiceTypes(): Promise<ServiceType[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('service_types')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapServiceType);
}

export function useServiceTypes() {
  const {
    data: serviceTypes,
    error,
    isLoading,
    mutate,
  } = useSWR(SERVICE_TYPES_KEY, fetchServiceTypes, {
    // Los tipos de servicio son datos de configuración que raramente cambian
    revalidateOnFocus: false,
    dedupingInterval: 300_000, // 5 minutos
    errorRetryCount: 3,
    errorRetryInterval: 2000,
  });

  return {
    serviceTypes: serviceTypes ?? [],
    isLoading,
    error:
      error instanceof Error ? error.message : error ? 'Error al cargar tipos de servicio' : null,
    refetch: () => mutate(),
  };
}
