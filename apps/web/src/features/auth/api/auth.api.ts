import { httpClient } from '@/shared/api/http-client';
import type {
  CompanyUser,
  DeviceSessionsResponse,
  LoginCompaniesResponse,
  LoginRequest,
  LogoutOthersResponse,
  MeResponse,
  SignupRequest,
  UpdateProfilePayload,
} from '@/features/auth/model/types';

export async function login(payload: LoginRequest): Promise<void> {
  await httpClient.post('/auth/login', payload);
}

export async function getLoginCompanies(): Promise<LoginCompaniesResponse> {
  const res = await httpClient.get<LoginCompaniesResponse>('/auth/companies');
  return res.data;
}

export async function signupRequest(payload: SignupRequest): Promise<void> {
  await httpClient.post('/auth/signup-request', payload);
}

export async function getMe(): Promise<MeResponse> {
  const res = await httpClient.get<MeResponse>('/auth/me');
  return res.data;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<MeResponse> {
  const res = await httpClient.patch<MeResponse>('/auth/me', payload);
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

export async function getCompanyUsers(): Promise<CompanyUser[]> {
  const res = await httpClient.get<CompanyUser[]>('/users');
  return res.data;
}

export async function approveCompanyUser(userId: string): Promise<void> {
  await httpClient.patch(`/users/${userId}/activate`);
}
