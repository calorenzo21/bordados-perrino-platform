import { getAdminClientDetail } from '@/lib/services/clients.server';

import { ClientDetailClient } from './_components/ClientDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 0;

export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params;
  const initialClient = await getAdminClientDetail(id);
  return <ClientDetailClient clientId={id} initialClient={initialClient} />;
}
