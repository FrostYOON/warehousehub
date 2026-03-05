import type { UserRole } from '@/features/auth/model/types';

const INBOUND_ALLOWED_ROLES: ReadonlySet<UserRole> = new Set([
  'ADMIN',
  'WH_MANAGER',
]);

const CUSTOMERS_ALLOWED_ROLES: ReadonlySet<UserRole> = new Set([
  'ADMIN',
  'WH_MANAGER',
]);

export function canAccessInbound(role?: UserRole): boolean {
  if (!role) return false;
  return INBOUND_ALLOWED_ROLES.has(role);
}

export function canAccessCustomers(role?: UserRole): boolean {
  if (!role) return false;
  return CUSTOMERS_ALLOWED_ROLES.has(role);
}
