import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;

    // Auth check — must be admin
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

    if (currentProfile?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const adminClient = await createAdminClient();

    // Get client record
    const { data: client, error: clientError } = await adminClient
      .from('clients')
      .select('id, user_id')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Count ALL orders (including cancelled) to decide delete strategy
    const { count: orderCount, error: countError } = await adminClient
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId);

    if (countError) {
      return NextResponse.json({ error: 'Error al verificar pedidos' }, { status: 500 });
    }

    const hasOrders = (orderCount ?? 0) > 0;

    if (hasOrders) {
      // Soft delete — hide client but preserve all records
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

    // Hard delete — no orders, safe to remove completely
    const { error: deleteClientError } = await adminClient
      .from('clients')
      .delete()
      .eq('id', clientId);

    if (deleteClientError) {
      return NextResponse.json({ error: 'Error al eliminar cliente' }, { status: 500 });
    }

    // Delete auth user if linked (cascades to profiles automatically)
    if (client.user_id) {
      await adminClient.auth.admin.deleteUser(client.user_id);
    }

    revalidatePath('/admin/clients');
    return NextResponse.json({ deleted: true, deactivated: false });
  } catch (error) {
    console.error('[DELETE /api/clients/[id]]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
