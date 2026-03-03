import { httpClient } from '@/shared/api/http-client';
import type {
  ReturnLineDecision,
  ReturnReceipt,
} from '@/features/returns/model/types';
import type { StorageType } from '@/features/returns/model/types';

export type CustomerOption = {
  id: string;
  customerName: string;
};

export async function getReturns(): Promise<ReturnReceipt[]> {
  const res = await httpClient.get<ReturnReceipt[]>('/returns');
  return res.data;
}

export async function getReturnDetail(id: string): Promise<ReturnReceipt> {
  const res = await httpClient.get<ReturnReceipt>(`/returns/${id}`);
  return res.data;
}

export async function decideReturn(
  id: string,
  lines: Array<{ lineId: string; decision: ReturnLineDecision }>,
): Promise<void> {
  await httpClient.post(`/returns/${id}/decide`, { lines });
}

export async function processReturn(
  id: string,
  lineIds: string[],
): Promise<void> {
  await httpClient.post(`/returns/${id}/process`, { lineIds });
}

export async function getCustomers(): Promise<CustomerOption[]> {
  const res = await httpClient.get<CustomerOption[]>('/customers');
  return res.data;
}

export async function createReturn(
  payload: {
    customerId?: string;
    receivedAt?: string;
    memo?: string;
    lines: Array<{
      itemId: string;
      storageType: StorageType;
      expiryDate?: string | null;
      qty: number;
    }>;
  },
): Promise<ReturnReceipt> {
  const res = await httpClient.post<ReturnReceipt>('/returns', payload);
  return res.data;
}

export async function updateReturn(
  id: string,
  payload: {
    lines?: Array<{
      id?: string;
      itemId?: string;
      storageType?: StorageType;
      expiryDate?: string;
      clearExpiryDate?: boolean;
      qty?: number;
      isDeleted?: boolean;
    }>;
    customerId?: string | null;
    receivedAt?: string;
    memo?: string | null;
  },
): Promise<ReturnReceipt> {
  const res = await httpClient.patch<ReturnReceipt>(`/returns/${id}`, payload);
  return res.data;
}

export async function cancelReturn(id: string): Promise<void> {
  await httpClient.patch(`/returns/${id}/cancel`);
}
