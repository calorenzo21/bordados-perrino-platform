import { getDashboardData } from '@/lib/services/dashboard.server';

import { DashboardContent } from './_components/DashboardContent';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const dashboardData = await getDashboardData();

  return <DashboardContent initialData={dashboardData} />;
}
