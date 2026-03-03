import { httpClient } from '@/shared/api/http-client';
import type {
  InboundCreateUploadResponse,
  InboundUploadDetail,
  InboundUploadsListResponse,
} from '@/features/inbound/model/types';

export async function getInboundUploads(query?: {
  status?: '' | 'UPLOADED' | 'CONFIRMED' | 'CANCELLED';
  keyword?: string;
  page?: number;
  pageSize?: number;
}): Promise<InboundUploadsListResponse> {
  const params = new URLSearchParams();
  if (query?.status) params.set('status', query.status);
  if (query?.keyword?.trim()) params.set('keyword', query.keyword.trim());
  if (query?.page) params.set('page', String(query.page));
  if (query?.pageSize) params.set('pageSize', String(query.pageSize));
  const res = await httpClient.get<InboundUploadsListResponse>('/inbound/uploads', { params });
  return res.data;
}

export async function getInboundUploadDetail(
  uploadId: string,
  query?: { rowPage?: number; rowPageSize?: number },
): Promise<InboundUploadDetail> {
  const params = new URLSearchParams();
  if (query?.rowPage) params.set('rowPage', String(query.rowPage));
  if (query?.rowPageSize) params.set('rowPageSize', String(query.rowPageSize));
  const res = await httpClient.get<InboundUploadDetail>(`/inbound/uploads/${uploadId}`, { params });
  return res.data;
}

export async function createInboundUpload(
  file: File,
): Promise<InboundCreateUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await httpClient.post<InboundCreateUploadResponse>(
    '/inbound/uploads',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
  return res.data;
}

export async function confirmInboundUpload(uploadId: string): Promise<void> {
  await httpClient.post(`/inbound/uploads/${uploadId}/confirm`);
}

export async function cancelInboundUpload(uploadId: string): Promise<void> {
  await httpClient.post(`/inbound/uploads/${uploadId}/cancel`);
}
