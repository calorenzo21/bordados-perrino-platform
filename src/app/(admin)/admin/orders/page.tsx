import { getOrdersData } from '@/lib/services/orders.server';

import { OrdersContent } from './_components/OrdersContent';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  const { orders } = await getOrdersData();

  return <OrdersContent initialOrders={orders} />;
}
