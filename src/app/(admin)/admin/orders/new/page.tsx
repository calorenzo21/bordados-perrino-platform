import { Suspense } from 'react';

import { Loader2 } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';

import NewOrderContent from './_components/NewOrderContent';
import { SWRFallbackProvider } from './_components/SWRFallbackProvider';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default async function NewOrderPage() {
  const supabase = await createClient();

  const [clientsRes, serviceTypesRes] = await Promise.all([
    supabase.from('clients_with_stats').select('*').order('created_at', { ascending: false }),
    supabase
      .from('service_types')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initialClients = (clientsRes.data ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    initials: getInitials(c.name),
    email: c.email,
    phone: c.phone,
    cedula: c.cedula || '',
    address: c.address || '',
    totalOrders: c.total_orders || 0,
    activeOrders: c.active_orders || 0,
    totalSpent: c.total_spent || 0,
    lastOrderDate: c.last_order_date?.split('T')[0] || '',
    createdAt: c.created_at?.split('T')[0] || '',
    orders: [],
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initialServiceTypes = (serviceTypesRes.data ?? []).map((st: any) => ({
    id: st.id,
    name: st.name,
    description: st.description,
    icon: st.icon,
    color: st.color,
    isActive: st.is_active,
    displayOrder: st.display_order,
  }));

  return (
    <SWRFallbackProvider
      fallback={{
        'admin-clients-list': initialClients,
        'service-types-active': initialServiceTypes,
      }}
    >
      <Suspense
        fallback={
          <div className="flex h-96 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        }
      >
        <NewOrderContent />
      </Suspense>
    </SWRFallbackProvider>
  );
}
