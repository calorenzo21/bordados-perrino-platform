/**
 * API Route: Client Panel Data
 *
 * GET /api/client/panel
 * Returns profile, stats, and orders for the authenticated client
 */
import { NextResponse } from 'next/server';

import { getClientPanelData } from '@/lib/services/client-portal.server';

export async function GET() {
  try {
    const data = await getClientPanelData();

    if (!data) {
      return NextResponse.json({ error: 'No autenticado o sin datos de cliente' }, { status: 401 });
    }

    return NextResponse.json(data, {
      headers: {
        // Cache for 5 minutes on client, stale-while-revalidate for 1 hour
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    console.error('Error fetching panel data:', error);
    return NextResponse.json({ error: 'Error al cargar los datos' }, { status: 500 });
  }
}
