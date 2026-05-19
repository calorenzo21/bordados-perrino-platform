import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient, createClient } from '@/lib/supabase/server';
import { hasAdminAccess } from '@/lib/utils/roles';
import { deleteStorageObjectsByUrl } from '@/lib/utils/storage-cleanup';

/**
 * DELETE /api/clients/[id]
 *
 * Strategy:
 *  - Client has NO orders            → hard delete (client row + auth user).
 *  - Client HAS orders, default      → soft delete (is_active = false), all
 *                                      records preserved.
 *  - Client HAS orders, ?mode=hard   → hard delete: removes the client and
 *                                      ALL of their orders/payments/history
 *                                      in one transaction, plus Storage
 *                                      photos and the auth account.
 *
 * The `?mode=hard` path is the deliberate, explicit "delete everything"
 * choice from the admin UI — the soft delete stays the safe default so a
 * real client's accounting history is never wiped by accident.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const hardMode = request.nextUrl.searchParams.get('mode') === 'hard';

    // Auth check — must be admin.
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!hasAdminAccess(currentProfile?.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const adminClient = await createAdminClient();

    // Get client record.
    const { data: client, error: clientError } = await adminClient
      .from('clients')
      .select('id, user_id')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Count ALL orders (including cancelled) to decide the delete strategy.
    const { count: orderCount, error: countError } = await adminClient
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId);

    if (countError) {
      return NextResponse.json({ error: 'Error al verificar pedidos' }, { status: 500 });
    }

    const hasOrders = (orderCount ?? 0) > 0;

    // Client with orders, no explicit hard request → soft delete.
    if (hasOrders && !hardMode) {
      const { error: updateError } = await adminClient
        .from('clients')
        .update({ is_active: false })
        .eq('id', clientId);

      if (updateError) {
        return NextResponse.json({ error: 'Error al desactivar cliente' }, { status: 500 });
      }

      revalidatePath('/admin/clients');
      return NextResponse.json({ deleted: false, deactivated: true });
    }

    // Hard delete — either the client has no orders, or ?mode=hard was sent.
    // `delete_client_hard` removes the client + all their orders in one
    // transaction and returns the URLs of every Storage photo it deleted.
    const { data: photoUrls, error: rpcError } = await adminClient.rpc('delete_client_hard', {
      p_client_id: clientId,
    });

    if (rpcError) {
      console.error('[DELETE /api/clients/[id]] rpc error:', rpcError);
      return NextResponse.json({ error: 'Error al eliminar cliente' }, { status: 500 });
    }

    // Best-effort Storage cleanup — rows are already gone, never fail here.
    await deleteStorageObjectsByUrl(adminClient, (photoUrls as string[] | null) ?? []);

    // Delete the auth user if linked (cascades to the profiles row).
    if (client.user_id) {
      await adminClient.auth.admin.deleteUser(client.user_id);
    }

    revalidatePath('/admin/clients');
    revalidatePath('/admin/orders');
    revalidatePath('/admin');
    return NextResponse.json({ deleted: true, deactivated: false });
  } catch (error) {
    console.error('[DELETE /api/clients/[id]]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
