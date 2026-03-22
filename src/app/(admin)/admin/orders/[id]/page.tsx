import { getAdminOrderDetail } from '@/lib/services/orders.server';

import { OrderDetailClient } from './_components/OrderDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 0;

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const initialOrder = await getAdminOrderDetail(id);
  return <OrderDetailClient orderId={id} initialOrder={initialOrder} />;
}
