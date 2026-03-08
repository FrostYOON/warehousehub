import { httpClient } from '@/shared/api/http-client';
import type { OutboundOrder } from '@/features/outbound/model/types';

export type CustomerOption = {
  id: string;
  customerName: string;
};

type CreateOutboundOrderPayload = {
  customerId: string;
  plannedDate: string;
  memo?: string;
  lines: Array<{
    itemId: string;
    requestedQty: number;
  }>;
};

export async function getOutboundOrders(): Promise<OutboundOrder[]> {
  const res = await httpClient.get<OutboundOrder[]>('/outbound/orders');
  return res.data;
}

export async function getOutboundOrderDetail(orderId: string): Promise<OutboundOrder> {
  const res = await httpClient.get<OutboundOrder>(`/outbound/orders/${orderId}`);
  return res.data;
}

export async function submitPick(orderId: string): Promise<void> {
  await httpClient.post(`/outbound/orders/${orderId}/pick/submit`);
}

export async function verifyShipping(orderId: string): Promise<void> {
  await httpClient.post(`/outbound/orders/${orderId}/ship/verify`);
}

export async function startShipping(orderId: string): Promise<void> {
  await httpClient.post(`/outbound/orders/${orderId}/ship/start`);
}

export async function completeShipping(orderId: string): Promise<void> {
  await httpClient.post(`/outbound/orders/${orderId}/ship/complete`);
}

export async function getCustomers(): Promise<CustomerOption[]> {
  const res = await httpClient.get<{
    total: number;
    page: number;
    pageSize: number;
    items: CustomerOption[];
  }>('/customers');
  return res.data.items;
}

export async function createOutboundOrder(
  payload: CreateOutboundOrderPayload,
): Promise<OutboundOrder> {
  const res = await httpClient.post<OutboundOrder>('/outbound/orders', payload);
  return res.data;
}

export async function updateOutboundLine(
  orderId: string,
  lineId: string,
  requestedQty: number,
): Promise<void> {
  await httpClient.patch(`/outbound/orders/${orderId}/lines/${lineId}`, {
    requestedQty,
  });
}

export async function cancelOutboundLine(orderId: string, lineId: string): Promise<void> {
  await httpClient.patch(`/outbound/orders/${orderId}/lines/${lineId}/cancel`);
}

export async function cancelOutboundOrder(orderId: string, reason?: string): Promise<void> {
  await httpClient.patch(`/outbound/orders/${orderId}/cancel`, { reason });
}

export async function exportOutbound(): Promise<Blob> {
  const res = await httpClient.get('/outbound/orders/export', { responseType: 'blob' });
  return res.data as Blob;
}
