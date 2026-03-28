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
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // User is authenticated but has no linked client record yet — not an error
    if ('clientNotLinked' in data) {
      return NextResponse.json({ clientNotLinked: true });
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('Error fetching panel data:', error);
    return NextResponse.json({ error: 'Error al cargar los datos' }, { status: 500 });
  }
}
