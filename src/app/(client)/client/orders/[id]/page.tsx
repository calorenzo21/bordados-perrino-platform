'use client';

import { use } from 'react';

import { OrderDetailContent } from '@/components/client/OrderDetailContent';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ClientOrderDetailPage({ params }: PageProps) {
  const { id } = use(params);

  // Client Component puro - SWR maneja el caché
  // Primera visita: muestra skeleton mientras carga
  // Visitas subsecuentes: muestra datos cacheados instantáneamente
  return <OrderDetailContent orderId={id} />;
}
