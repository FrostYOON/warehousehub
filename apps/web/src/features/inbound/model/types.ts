export type InboundUploadStatus = 'UPLOADED' | 'CONFIRMED' | 'CANCELLED';

export type InboundUploadSummary = {
  id: string;
  fileName: string;
  status: InboundUploadStatus;
  createdAt: string;
  confirmedAt: string | null;
  invalidCount: number;
  rowCount: number;
};

export type InboundUploadRow = {
  id: string;
  itemCode: string;
  itemName: string;
  storageType: 'DRY' | 'COOL' | 'FRZ';
  quantity: number;
  expiryDate: string | null;
  isValid: boolean;
  errorMessage: string | null;
};

export type InboundUploadDetail = {
  id: string;
  fileName: string;
  status: InboundUploadStatus;
  createdAt: string;
  confirmedAt: string | null;
  rows: InboundUploadRow[];
};

export type InboundCreateUploadResponse = {
  id: string;
  invalidCount: number;
};
