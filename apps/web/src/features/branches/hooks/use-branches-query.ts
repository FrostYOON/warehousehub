'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listBranches,
  getBranch,
  createBranch,
} from '@/features/branches/api/branches.api';
import type { CreateBranchPayload } from '@/features/branches/model/types';
import { branchesKeys } from '@/features/branches/lib/query-keys';

export function useBranchesQuery(enabled = true) {
  const query = useQuery({
    queryKey: branchesKeys.list(),
    queryFn: listBranches,
    staleTime: 30_000,
    enabled,
  });

  return {
    branches: query.data ?? [],
    loading: query.isFetching,
    refetch: query.refetch,
  };
}

export function useBranchDetail(id: string | null, enabled = true) {
  const query = useQuery({
    queryKey: branchesKeys.detail(id ?? ''),
    queryFn: () => getBranch(id!),
    enabled: enabled && !!id,
  });

  return {
    branch: query.data ?? null,
    loading: query.isFetching,
    refetch: query.refetch,
  };
}

export function useCreateBranchMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateBranchPayload) => createBranch(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: branchesKeys.all });
    },
  });
}
