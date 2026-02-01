import { getOrdersData } from '@/lib/services/orders.server';

import { OrdersContent } from './_components/OrdersContent';

// Revalidar cada 5 minutos como fallback.
// La invalidación principal ocurre via revalidatePath() cuando hay cambios.
export const revalidate = 300;

export default async function AdminOrdersPage() {
  const { orders } = await getOrdersData();

  return <OrdersContent initialOrders={orders} />;
}
