/**
 * API Route: Client Order Detail
 *
 * GET /api/client/orders/[id]
 * Returns detailed order information for the authenticated client
 */
import { NextResponse } from 'next/server';

import { getClientOrderDetail } from '@/lib/services/client-portal.server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const order = await getClientOrderDetail(id);

    if (!order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    return NextResponse.json(order, {
      headers: {
        // Cache for 5 minutes on client, stale-while-revalidate for 1 hour
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json({ error: 'Error al cargar el pedido' }, { status: 500 });
  }
}
