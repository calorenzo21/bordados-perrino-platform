import { SupabaseClient } from '@supabase/supabase-js';

import { hasAdminAccess } from '@/lib/utils/roles';

interface CreateOrReuseParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface CreateOrReuseResult {
  data: { userId: string; isReused: boolean } | null;
  error: string | null;
}

/**
 * Try to create a new Supabase Auth user. If the email is already taken by a
 * soft-deleted client (is_active=false) or an INACTIVE profile, reuse the
 * existing auth user instead of failing.
 *
 * Returns `isReused: true` when an existing user was recycled — the caller
 * is responsible for updating the profile/client records accordingly.
 */
export async function createOrReuseAuthUser(
  adminClient: SupabaseClient,
  { email, password, firstName, lastName }: CreateOrReuseParams
): Promise<CreateOrReuseResult> {
  // 1. Try the happy path first — create a brand-new auth user
  const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  });

  if (!createError && authData.user) {
    return { data: { userId: authData.user.id, isReused: false }, error: null };
  }

  // 2. If the error is NOT about a duplicate email, propagate it
  const isDuplicate =
    createError?.message?.toLowerCase().includes('already') ||
    createError?.message?.toLowerCase().includes('registered') ||
    createError?.message?.toLowerCase().includes('exists');

  if (!isDuplicate) {
    return { data: null, error: createError?.message || 'Error al crear usuario' };
  }

  // 3. Email already exists — check if the existing user is reusable
  const { data: existingProfile } = await adminClient
    .from('profiles')
    .select('id, role')
    .eq('email', email)
    .single();

  if (!existingProfile) {
    // Auth user exists but no profile row — edge case (trigger failure).
    // We can't safely reuse without knowing the profile state.
    return { data: null, error: 'Ya existe un usuario con este correo' };
  }

  // Active admin/superadmin — never reuse
  if (hasAdminAccess(existingProfile.role)) {
    return { data: null, error: 'Ya existe un administrador activo con este correo' };
  }

  // INACTIVE profile — always reusable (was a soft-deleted admin)
  const isInactive = existingProfile.role === 'INACTIVE';

  // CLIENT profile — only reusable if the linked client record is soft-deleted
  let isDeactivatedClient = false;
  if (existingProfile.role === 'CLIENT') {
    const { data: clientRecord } = await adminClient
      .from('clients')
      .select('is_active')
      .eq('user_id', existingProfile.id)
      .single();

    if (clientRecord && clientRecord.is_active === false) {
      isDeactivatedClient = true;
    } else {
      // Active client — cannot reuse
      return { data: null, error: 'Ya existe un cliente activo con este correo' };
    }
  }

  if (!isInactive && !isDeactivatedClient) {
    return { data: null, error: 'Ya existe un usuario con este correo' };
  }

  // 4. Reuse: unban, update password and metadata
  const { error: updateError } = await adminClient.auth.admin.updateUserById(existingProfile.id, {
    password,
    email_confirm: true,
    ban_duration: 'none',
    user_metadata: { first_name: firstName, last_name: lastName },
  });

  if (updateError) {
    console.error('[reuse-auth-user] Failed to update auth user:', updateError);
    return { data: null, error: 'Error al reactivar usuario existente' };
  }

  return { data: { userId: existingProfile.id, isReused: true }, error: null };
}
