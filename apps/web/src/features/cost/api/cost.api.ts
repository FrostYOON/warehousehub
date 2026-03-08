import { httpClient } from '@/shared/api/http-client';

export type InboundCostHistoryParams = {
  page?: number;
  pageSize?: number;
  itemId?: string;
  from?: string;
  to?: string;
};

export type InboundCostHistoryLine = {
  id: string;
  itemCode: string;
  itemName: string;
  itemId: string;
  expiryDate: string | null;
  qty: number;
  unitCost: number | null;
  totalCost: number | null;
};

export type InboundCostHistoryItem = {
  id: string;
  refId: string;
  createdAt: string;
  lines: InboundCostHistoryLine[];
};

export type InboundCostHistoryResponse = {
  items: InboundCostHistoryItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function getInboundCostHistory(
  params?: InboundCostHistoryParams,
): Promise<InboundCostHistoryResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.itemId) searchParams.set('itemId', params.itemId);
  if (params?.from) searchParams.set('from', params.from);
  if (params?.to) searchParams.set('to', params.to);
  const qs = searchParams.toString();
  const url = qs ? `/cost/inbound-history?${qs}` : '/cost/inbound-history';
  const res = await httpClient.get<InboundCostHistoryResponse>(url);
  return res.data;
}

export type ItemsCostSummaryItem = {
  id: string;
  itemCode: string;
  itemName: string;
  unitCost: number | null;
};

export type ItemsCostSummaryResponse = {
  items: ItemsCostSummaryItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function getItemsCostSummary(params?: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<ItemsCostSummaryResponse> {
  const searchParams = new URLSearchParams();
  if (params?.q) searchParams.set('q', params.q);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  const qs = searchParams.toString();
  const url = qs ? `/cost/items-summary?${qs}` : '/cost/items-summary';
  const res = await httpClient.get<ItemsCostSummaryResponse>(url);
  return res.data;
}
