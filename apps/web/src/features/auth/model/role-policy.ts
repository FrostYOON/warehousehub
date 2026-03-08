import type { UserRole } from '@/features/auth/model/types';

const INBOUND_ALLOWED_ROLES: ReadonlySet<UserRole> = new Set([
  'ADMIN',
  'WH_MANAGER',
]);

const BRANCHES_ROLES: ReadonlySet<UserRole> = new Set([
  'ADMIN',
  'WH_MANAGER',
]);

const TEMPERATURE_MONITOR_ROLES: ReadonlySet<UserRole> = new Set([
  'ADMIN',
  'WH_MANAGER',
]);

const TRANSFERS_ROLES: ReadonlySet<UserRole> = new Set([
  'ADMIN',
  'WH_MANAGER',
]);

const RETURN_MANAGE_ROLES: ReadonlySet<UserRole> = new Set([
  'ADMIN',
  'WH_MANAGER',
]);

const RETURN_CREATE_EDIT_ROLES: ReadonlySet<UserRole> = new Set([
  'ADMIN',
  'DELIVERY',
  'SALES',
]);

const OUTBOUND_EDIT_ROLES: ReadonlySet<UserRole> = new Set([
  'ADMIN',
  'SALES',
]);

const OUTBOUND_CANCEL_ROLES: ReadonlySet<UserRole> = new Set([
  'ADMIN',
  'SALES',
]);

/** 대시보드 접근: ADMIN, WH_MANAGER, SALES, ACCOUNTING (DELIVERY 제외) */
const DASHBOARD_ALLOWED_ROLES: ReadonlySet<UserRole> = new Set([
  'ADMIN',
  'WH_MANAGER',
  'SALES',
  'ACCOUNTING',
]);

export function canAccessInbound(role?: UserRole): boolean {
  if (!role) return false;
  return INBOUND_ALLOWED_ROLES.has(role);
}

export function canAccessBranches(role?: UserRole): boolean {
  if (!role) return false;
  return BRANCHES_ROLES.has(role);
}

/** 온도 모니터: ADMIN, WH_MANAGER만 접근·기입 */
export function canAccessTemperatureMonitor(role?: UserRole): boolean {
  if (!role) return false;
  return TEMPERATURE_MONITOR_ROLES.has(role);
}

/** 창고 간 이동: ADMIN, WH_MANAGER */
export function canAccessTransfers(role?: UserRole): boolean {
  if (!role) return false;
  return TRANSFERS_ROLES.has(role);
}

/** 입고 예정(ASN): ADMIN, WH_MANAGER */
export function canAccessAsn(role?: UserRole): boolean {
  if (!role) return false;
  return INBOUND_ALLOWED_ROLES.has(role);
}

/** 비용/원가 관리: ADMIN, WH_MANAGER, ACCOUNTING */
const COST_ALLOWED_ROLES: ReadonlySet<UserRole> = new Set([
  'ADMIN',
  'WH_MANAGER',
  'ACCOUNTING',
]);

export function canAccessCost(role?: UserRole): boolean {
  if (!role) return false;
  return COST_ALLOWED_ROLES.has(role);
}

/** 대시보드: ADMIN, WH_MANAGER, SALES, ACCOUNTING (DELIVERY 제외) */
export function canAccessDashboard(role?: UserRole): boolean {
  if (!role) return false;
  return DASHBOARD_ALLOWED_ROLES.has(role);
}

/** 회원 승인/관리: ADMIN만 */
export function canAccessMembers(role?: UserRole): boolean {
  return role === 'ADMIN';
}

/** 고객사: 전체 역할 접근 가능 */
export function canAccessCustomers(_role?: UserRole): boolean {
  return true;
}

/** 재고 조회: ADMIN, WH_MANAGER, DELIVERY, ACCOUNTING, SALES */
const STOCKS_VIEW_ROLES: ReadonlySet<UserRole> = new Set([
  'ADMIN',
  'WH_MANAGER',
  'DELIVERY',
  'ACCOUNTING',
  'SALES',
]);

/** 재고 수정(관리): ADMIN, WH_MANAGER */
const STOCKS_EDIT_ROLES: ReadonlySet<UserRole> = new Set([
  'ADMIN',
  'WH_MANAGER',
]);

export function canViewStock(role?: UserRole): boolean {
  if (!role) return false;
  return STOCKS_VIEW_ROLES.has(role);
}

export function canEditStock(role?: UserRole): boolean {
  if (!role) return false;
  return STOCKS_EDIT_ROLES.has(role);
}

/** 출고 오더 취소: ADMIN, SALES */
export function canCancelOrder(role?: UserRole): boolean {
  if (!role) return false;
  return OUTBOUND_CANCEL_ROLES.has(role);
}

/** 반품 결정(decide)/처리(process): ADMIN, WH_MANAGER */
export function canProcessReturn(role?: UserRole): boolean {
  if (!role) return false;
  return RETURN_MANAGE_ROLES.has(role);
}

/** 반품 접수 생성/수정/취소: ADMIN, DELIVERY, SALES */
export function canEditReturnReceipt(role?: UserRole): boolean {
  if (!role) return false;
  return RETURN_CREATE_EDIT_ROLES.has(role);
}

/** 출고 오더 생성/수정: ADMIN, SALES (상태 검사는 호출측) */
export function canEditOutboundOrder(role?: UserRole): boolean {
  if (!role) return false;
  return OUTBOUND_EDIT_ROLES.has(role);
}
