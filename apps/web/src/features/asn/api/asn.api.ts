import { httpClient } from '@/shared/api/http-client';
import type { Asn, CreateAsnPayload } from '@/features/asn/model/types';

export type ListAsnParams = {
  status?: string;
  toBranchId?: string;
  toWarehouseId?: string;
};

export async function getAsnList(params?: ListAsnParams): Promise<Asn[]> {
  const res = await httpClient.get<Asn[]>('/asn', { params });
  return res.data;
}

export async function getAsnDetail(id: string): Promise<Asn> {
  const res = await httpClient.get<Asn>(`/asn/${id}`);
  return res.data;
}

export async function createAsn(payload: CreateAsnPayload): Promise<Asn> {
  const res = await httpClient.post<Asn>('/asn', payload);
  return res.data;
}

export async function cancelAsn(id: string): Promise<Asn> {
  const res = await httpClient.patch<Asn>(`/asn/${id}/cancel`);
  return res.data;
}
