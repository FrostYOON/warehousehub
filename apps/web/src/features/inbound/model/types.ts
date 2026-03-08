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
  unitCost?: number | null;
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
  rowTotal: number;
  rowPage: number;
  rowPageSize: number;
  rowTotalPages: number;
};

export type InboundCreateUploadResponse = {
  id: string;
  invalidCount: number;
};

export type InboundUploadsListResponse = {
  items: InboundUploadSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
