import { getClientsData } from '@/lib/services/clients.server';

import { ClientsContent } from './_components/ClientsContent';

// Revalidar cada 5 minutos como fallback.
// La invalidación principal ocurre via revalidatePath() cuando hay cambios.
export const revalidate = 300;

export default async function AdminClientsPage() {
  const { clients } = await getClientsData();

  return <ClientsContent initialClients={clients} />;
}
