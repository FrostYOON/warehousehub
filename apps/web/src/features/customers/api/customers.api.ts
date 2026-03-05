import { httpClient } from '@/shared/api/http-client';
import type { Customer, CreateCustomerPayload, UpdateCustomerPayload } from '@/features/customers/model/types';

export type ListCustomersParams = {
  q?: string;
  includeInactive?: boolean;
  isActive?: boolean;
};

export async function listCustomers(
  params?: ListCustomersParams,
): Promise<Customer[]> {
  const searchParams = new URLSearchParams();
  if (params?.q?.trim()) searchParams.set('q', params.q.trim());
  if (params?.includeInactive === true) searchParams.set('includeInactive', 'true');
  if (params?.isActive === true) searchParams.set('isActive', 'true');
  if (params?.isActive === false) searchParams.set('isActive', 'false');

  const qs = searchParams.toString();
  const url = qs ? `/customers?${qs}` : '/customers';
  const res = await httpClient.get<Customer[]>(url);
  return res.data;
}

export async function createCustomer(
  payload: CreateCustomerPayload,
): Promise<Customer> {
  const res = await httpClient.post<Customer>('/customers', payload);
  return res.data;
}

export async function updateCustomer(
  id: string,
  payload: UpdateCustomerPayload,
): Promise<Customer> {
  const res = await httpClient.patch<Customer>(`/customers/${id}`, payload);
  return res.data;
}

export async function activateCustomer(id: string): Promise<Customer> {
  const res = await httpClient.patch<Customer>(`/customers/${id}/activate`);
  return res.data;
}

export async function deactivateCustomer(id: string): Promise<Customer> {
  const res = await httpClient.patch<Customer>(`/customers/${id}/deactivate`);
  return res.data;
}
