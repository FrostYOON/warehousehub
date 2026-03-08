import { httpClient } from '@/shared/api/http-client';
import type {
  CompanyUser,
  DeviceSessionsResponse,
  LoginCompaniesResponse,
  LoginRequest,
  LogoutOthersResponse,
  MeResponse,
  RegisterRequest,
  SignupRequest,
  UpdateProfilePayload,
} from '@/features/auth/model/types';

export async function login(payload: LoginRequest): Promise<{ user: { role: string } }> {
  const res = await httpClient.post<{ user: { role: string } }>(
    '/auth/login',
    payload,
  );
  return res.data;
}

export async function getLoginCompanies(): Promise<LoginCompaniesResponse> {
  const res = await httpClient.get<LoginCompaniesResponse>('/auth/companies');
  return res.data;
}

/** 회사 신규 등록 + 최초 ADMIN 계정 생성 */
export async function register(payload: RegisterRequest): Promise<void> {
  await httpClient.post('/auth/register', payload);
}

export async function signupRequest(payload: SignupRequest): Promise<void> {
  await httpClient.post('/auth/signup-request', payload);
}

export async function forgotPassword(payload: {
  companyName: string;
  email: string;
}): Promise<void> {
  await httpClient.post('/auth/forgot-password', payload);
}

export async function resetPassword(payload: {
  token: string;
  newPassword: string;
}): Promise<void> {
  await httpClient.post('/auth/reset-password', payload);
}

export async function getMe(): Promise<MeResponse> {
  const res = await httpClient.get<MeResponse>('/auth/me');
  return res.data;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<MeResponse> {
  const res = await httpClient.patch<MeResponse>('/auth/me', payload);
  return res.data;
}

export async function uploadProfileImage(file: File): Promise<MeResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await httpClient.post<MeResponse>('/auth/me/avatar', formData);
  return res.data;
}

export async function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await httpClient.post('/auth/change-password', payload);
}

export async function logout(): Promise<void> {
  await httpClient.post('/auth/logout');
}

export async function getDeviceSessions(): Promise<DeviceSessionsResponse> {
  const res = await httpClient.get<DeviceSessionsResponse>('/auth/devices');
  return res.data;
}

export async function revokeDeviceSession(sessionId: string): Promise<void> {
  await httpClient.delete(`/auth/devices/${sessionId}`);
}

export async function logoutOtherDevices(): Promise<LogoutOthersResponse> {
  const res = await httpClient.post<LogoutOthersResponse>(
    '/auth/devices/logout-others',
  );
  return res.data;
}

export type ListCompanyUsersParams = {
  role?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'name' | 'email' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
};

export type ListCompanyUsersResponse = {
  total: number;
  page: number;
  limit: number;
  items: CompanyUser[];
};

export type GetCompanyUsersOptions = {
  /** refetch 시 캐시 무시 (승인/거절 후 목록 갱신 등) */
  noCache?: boolean;
};

export async function getCompanyUsers(
  params?: ListCompanyUsersParams,
  options?: GetCompanyUsersOptions,
): Promise<ListCompanyUsersResponse> {
  const searchParams = new URLSearchParams();
  if (params?.role) searchParams.set('role', params.role);
  if (params?.isActive !== undefined)
    searchParams.set('isActive', String(params.isActive));
  if (params?.page !== undefined) searchParams.set('page', String(params.page));
  if (params?.limit !== undefined)
    searchParams.set('limit', String(params.limit));
  if (params?.search) searchParams.set('search', params.search);
  if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  if (options?.noCache) searchParams.set('_', String(Date.now()));
  const qs = searchParams.toString();
  const url = qs ? `/users?${qs}` : '/users';
  const config = options?.noCache
    ? { headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' } }
    : {};
  const res = await httpClient.get<ListCompanyUsersResponse>(url, config);
  return res.data;
}

export async function approveCompanyUser(userId: string): Promise<void> {
  await httpClient.patch(`/users/${userId}/activate`);
}

export async function deactivateCompanyUser(userId: string): Promise<void> {
  await httpClient.patch(`/users/${userId}/deactivate`);
}

export async function updateCompanyUserRole(
  userId: string,
  role: string,
): Promise<void> {
  await httpClient.patch(`/users/${userId}/role`, { role });
}

export type CreateCompanyUserPayload = {
  email: string;
  name: string;
  password: string;
  role: string;
};

export async function createCompanyUser(
  payload: CreateCompanyUserPayload,
): Promise<CompanyUser> {
  const res = await httpClient.post<CompanyUser>('/users', payload);
  return res.data;
}

export async function withdraw(): Promise<void> {
  await httpClient.post('/auth/withdraw');
}

export async function deleteCompanyUser(userId: string): Promise<void> {
  await httpClient.delete(`/users/${userId}`);
}

export async function bulkDeactivateCompanyUsers(
  userIds: string[],
): Promise<{ deactivated: number; skipped: number }> {
  const res = await httpClient.patch<{
    deactivated: number;
    skipped: number;
  }>('/users/bulk-deactivate', { userIds });
  return res.data;
}

export async function bulkRoleCompanyUsers(
  userIds: string[],
  role: string,
): Promise<{ updated: number; skipped: number }> {
  const res = await httpClient.patch<{
    updated: number;
    skipped: number;
  }>('/users/bulk-role', { userIds, role });
  return res.data;
}

export async function getUserAuditLogs(
  userId: string,
): Promise<import('@/features/auth/model/types').UserAuditLogsResponse> {
  const res = await httpClient.get(`/users/${userId}/audit-logs`);
  return res.data;
}
