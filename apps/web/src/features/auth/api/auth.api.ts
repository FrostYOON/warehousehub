import { httpClient } from '@/shared/api/http-client';
import type { LoginRequest, MeResponse } from '@/features/auth/model/types';

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
