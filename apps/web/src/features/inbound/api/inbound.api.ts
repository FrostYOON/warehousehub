import { httpClient } from '@/shared/api/http-client';
import type {
  InboundCreateUploadResponse,
  InboundUploadDetail,
  InboundUploadSummary,
} from '@/features/inbound/model/types';

export async function getInboundUploads(): Promise<InboundUploadSummary[]> {
  const res = await httpClient.get<InboundUploadSummary[]>('/inbound/uploads');
  return res.data;
}

export async function getInboundUploadDetail(
  uploadId: string,
): Promise<InboundUploadDetail> {
  const res = await httpClient.get<InboundUploadDetail>(`/inbound/uploads/${uploadId}`);
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
