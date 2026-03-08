import { httpClient } from '@/shared/api/http-client';
import type {
  Branch,
  BranchDetail,
  CreateBranchPayload,
} from '@/features/branches/model/types';

export async function listBranches(): Promise<Branch[]> {
  const res = await httpClient.get<Branch[]>('/branches');
  return res.data;
}

export async function getBranch(id: string): Promise<BranchDetail> {
  const res = await httpClient.get<BranchDetail>(`/branches/${id}`);
  return res.data;
}

export async function createBranch(
  payload: CreateBranchPayload,
): Promise<Branch> {
  const res = await httpClient.post<Branch>('/branches', payload);
  return res.data;
}
