'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/browser';

// Tipos para los servicios
export interface ServiceType {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string;
  isActive: boolean;
  displayOrder: number;
}

export function useServiceTypes() {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchServiceTypes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('service_types')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (queryError) throw queryError;

      const transformedTypes: ServiceType[] = (data || []).map(st => ({
        id: st.id,
        name: st.name,
        description: st.description,
        icon: st.icon,
        color: st.color,
        isActive: st.is_active,
        displayOrder: st.display_order,
      }));

      setServiceTypes(transformedTypes);
    } catch (err) {
      console.error('Error fetching service types:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar tipos de servicio');
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchServiceTypes();
  }, [fetchServiceTypes]);

  return { serviceTypes, isLoading, error, refetch: fetchServiceTypes };
}
