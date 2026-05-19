import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient, createClient } from '@/lib/supabase/server';
import { hasAdminAccess } from '@/lib/utils/roles';
import { deleteStorageObjectsByUrl } from '@/lib/utils/storage-cleanup';

/**
 * DELETE /api/orders/[id]
 *
 * Permanently removes one order. `payments`, `order_status_history`,
 * `order_images` and their photo rows all cascade. The `delete_order_cascade`
 * SQL function does the deletion in a single transaction and returns the
 * public URLs of the order's Storage photos, which we then clean up.
 *
 * `id` is the order UUID (orders.id), not the human ORD-NNN number.
 *
 * This is a hard delete — distinct from the "Cancelar" action, which only
 * moves the order to status CANCELADO and keeps every record.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

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

    // Confirm the order exists (distinguish 404 from a real failure).
    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .select('id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    // Delete the order + cascade. The function returns the photo URLs.
    const { data: photoUrls, error: deleteError } = await adminClient.rpc('delete_order_cascade', {
      p_order_id: orderId,
    });

    if (deleteError) {
      console.error('[DELETE /api/orders/[id]] rpc error:', deleteError);
      return NextResponse.json({ error: 'Error al eliminar el pedido' }, { status: 500 });
    }

    // Best-effort Storage cleanup — the rows are already gone, so a Storage
    // problem here must not fail the request.
    await deleteStorageObjectsByUrl(adminClient, (photoUrls as string[] | null) ?? []);

    revalidatePath('/admin/orders');
    revalidatePath('/admin');
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('[DELETE /api/orders/[id]]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
