import { httpClient } from '@/shared/api/http-client';
import type {
  Item,
  CreateItemPayload,
  UpdateItemPayload,
} from '@/features/items/model/types';

export type ListItemsParams = {
  q?: string;
  includeInactive?: boolean;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
};

export type ListItemsResponse = {
  total: number;
  page: number;
  pageSize: number;
  items: Item[];
};

export async function listItems(
  params?: ListItemsParams,
): Promise<ListItemsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.q?.trim()) searchParams.set('q', params.q.trim());
  if (params?.includeInactive === true)
    searchParams.set('includeInactive', 'true');
  if (params?.isActive === true) searchParams.set('isActive', 'true');
  if (params?.isActive === false) searchParams.set('isActive', 'false');
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));

  const qs = searchParams.toString();
  const url = qs ? `/items?${qs}` : '/items';
  const res = await httpClient.get<ListItemsResponse>(url);
  return res.data;
}

export async function createItem(payload: CreateItemPayload): Promise<Item> {
  const res = await httpClient.post<Item>('/items', payload);
  return res.data;
}

export async function updateItem(
  id: string,
  payload: UpdateItemPayload,
): Promise<Item> {
  const res = await httpClient.patch<Item>(`/items/${id}`, payload);
  return res.data;
}

export async function activateItem(id: string): Promise<Item> {
  const res = await httpClient.patch<Item>(`/items/${id}/activate`);
  return res.data;
}

export async function deactivateItem(id: string): Promise<Item> {
  const res = await httpClient.patch<Item>(`/items/${id}/deactivate`);
  return res.data;
}
