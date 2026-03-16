'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
}

export async function revalidateOrders() {
  await requireAuth();
  revalidatePath('/admin/orders');
  revalidatePath('/admin/dashboard');
}

export async function revalidateOrder(orderId: string) {
  await requireAuth();
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
  revalidatePath('/admin/dashboard');
  revalidatePath('/client/panel');
  revalidatePath(`/client/orders/${orderId}`);
}

export async function revalidateClients() {
  await requireAuth();
  revalidatePath('/admin/clients');
  revalidatePath('/admin/dashboard');
}

export async function revalidateClient(clientId: string) {
  await requireAuth();
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath('/admin/clients');
  revalidatePath('/admin/dashboard');
}

export async function revalidateExpenses() {
  await requireAuth();
  revalidatePath('/admin/expenses');
  revalidatePath('/admin/dashboard');
}

export async function revalidateExpenseTypes() {
  await requireAuth();
  revalidatePath('/admin/expenses');
}

export async function revalidateServiceTypes() {
  await requireAuth();
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/orders');
}

export async function revalidateDashboard() {
  await requireAuth();
  revalidatePath('/admin/dashboard');
}

export async function revalidateAll() {
  await requireAuth();
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/orders');
  revalidatePath('/admin/clients');
  revalidatePath('/admin/expenses');
}
