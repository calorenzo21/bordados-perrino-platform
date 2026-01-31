import { getClientsData } from '@/lib/services/clients.server';

import { ClientsContent } from './_components/ClientsContent';

export const dynamic = 'force-dynamic';

export default async function AdminClientsPage() {
  const { clients } = await getClientsData();

  return <ClientsContent initialClients={clients} />;
}
