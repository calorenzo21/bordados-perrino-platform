import type { UserRole } from '@/lib/types/database';

/** Returns true for ADMIN or SUPERADMIN roles */
export function hasAdminAccess(role: UserRole | null | undefined): boolean {
  return role === 'ADMIN' || role === 'SUPERADMIN';
}

/** Returns true only for SUPERADMIN */
export function isSuperAdmin(role: UserRole | null | undefined): boolean {
  return role === 'SUPERADMIN';
}
