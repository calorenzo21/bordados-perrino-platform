'use client';

import { PanelContent } from '@/components/client/PanelContent';

export default function ClientPanelPage() {
  // Client Component puro - SWR maneja el caché
  // Primera visita: muestra skeleton mientras carga
  // Visitas subsecuentes: muestra datos cacheados instantáneamente
  return <PanelContent />;
}
