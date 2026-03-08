import { httpClient } from '@/shared/api/http-client';
import type { TransfersListResponse } from '@/features/transfers/model/types';

export type ListTransfersParams = {
  status?: string;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  page?: number;
  pageSize?: number;
};

export async function getTransfers(
  params?: ListTransfersParams,
): Promise<TransfersListResponse> {
  const res = await httpClient.get<TransfersListResponse>('/transfers', {
    params,
  });
  return res.data;
}
