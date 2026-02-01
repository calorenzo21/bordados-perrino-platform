import { getDashboardData } from '@/lib/services/dashboard.server';

import { DashboardContent } from './_components/DashboardContent';

// Revalidar cada 5 minutos como fallback.
// La invalidación principal ocurre via revalidatePath() cuando hay cambios.
export const revalidate = 300;

export default async function AdminDashboardPage() {
  const dashboardData = await getDashboardData();

  return <DashboardContent initialData={dashboardData} />;
}
