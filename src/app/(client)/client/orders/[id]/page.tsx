import { getClientOrderDetail } from '@/lib/services/client-portal.server';

import { OrderDetailContent } from '@/components/client/OrderDetailContent';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 0;

export default async function ClientOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const initialData = (await getClientOrderDetail(id)) ?? undefined;
  return <OrderDetailContent orderId={id} initialData={initialData} />;
}
