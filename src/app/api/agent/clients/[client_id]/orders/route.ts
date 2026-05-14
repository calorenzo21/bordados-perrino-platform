import { type NextRequest, NextResponse } from 'next/server';

import { listOrdersForClient } from '@/lib/services/agent.service';
import { createAdminClient } from '@/lib/supabase/server';
import { ListOrdersQuerySchema } from '@/lib/types/agent';
import { handleApiError, successResponse } from '@/lib/utils/errors';

import { getXAgentPhone, verifyAgentBearer, verifyPhoneClientBinding } from '@/app/api/agent/_auth';

/**
 * EP-2 — GET /api/agent/clients/{client_id}/orders?limit=&include=
 *
 * Lists orders for a client. Defaults: limit=5, include=active.
 * include=active filters to RECIBIDO/CONFECCION/RETIRO/PARCIALMENTE_ENTREGADO.
 * include=all returns every order regardless of status.
 *
 * Cross-tenant 404 (T-I-05): if the phone doesn't own client_id, we return
 * 404 — never 403.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ client_id: string }> }
): Promise<NextResponse> {
  try {
    verifyAgentBearer(req);
    const phone = getXAgentPhone(req);

    const { client_id } = await context.params;
    const searchParams = req.nextUrl.searchParams;
    const query = ListOrdersQuerySchema.parse({
      limit: searchParams.get('limit') ?? undefined,
      include: searchParams.get('include') ?? undefined,
    });

    const supabase = await createAdminClient();
    await verifyPhoneClientBinding(phone, client_id, supabase);

    const orders = await listOrdersForClient(supabase, client_id, query);

    const res = successResponse(orders);
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
