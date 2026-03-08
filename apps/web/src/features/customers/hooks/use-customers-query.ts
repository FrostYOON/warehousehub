'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listCustomers,
  createCustomer,
  updateCustomer,
  activateCustomer,
  deactivateCustomer,
} from '@/features/customers/api/customers.api';
import type { CreateCustomerPayload, UpdateCustomerPayload } from '@/features/customers/model/types';
import { customersKeys } from '@/features/customers/lib/query-keys';

export type UseCustomersQueryParams = {
  q?: string;
  filterIsActive?: string; // 'all' | 'true' | 'false'
  enabled?: boolean;
};

export function useCustomersQuery(params: UseCustomersQueryParams = {}) {
  const queryClient = useQueryClient();

  const { q, filterIsActive } = params;
  const queryParams: Parameters<typeof listCustomers>[0] = {};
  if (q?.trim()) queryParams.q = q.trim();
  if (filterIsActive === 'all') queryParams.includeInactive = true;
  else if (filterIsActive === 'true') queryParams.isActive = true;
  else if (filterIsActive === 'false') queryParams.isActive = false;

  const query = useQuery({
    queryKey: customersKeys.list({ q, filterIsActive }),
    queryFn: () => listCustomers(queryParams),
    staleTime: 30_000,
    enabled: params.enabled !== false,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateCustomerPayload) => createCustomer(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customersKeys.all });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateCustomerPayload;
    }) => updateCustomer(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customersKeys.all });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deactivateCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customersKeys.all });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => activateCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customersKeys.all });
    },
  });

  return {
    data: query.data,
    items: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    loading: query.isFetching,
    refetch: query.refetch,
    createMutation,
    updateMutation,
    deactivateMutation,
    activateMutation,
  };
}
