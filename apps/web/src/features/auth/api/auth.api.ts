import { httpClient } from '@/shared/api/http-client';
import type {
  DeviceSessionsResponse,
  LoginRequest,
  LogoutOthersResponse,
  MeResponse,
} from '@/features/auth/model/types';

export async function login(payload: LoginRequest): Promise<void> {
  await httpClient.post('/auth/login', payload);
}

export async function getMe(): Promise<MeResponse> {
  const res = await httpClient.get<MeResponse>('/auth/me');
  return res.data;
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
