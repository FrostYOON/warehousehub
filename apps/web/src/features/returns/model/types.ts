import type { UserRole } from '@/features/auth/model/types';

export type StorageType = 'DRY' | 'COOL' | 'FRZ';

export type ReturnStatus = 'RECEIVED' | 'DECIDED' | 'COMPLETED' | 'CANCELLED';
export type ReturnLineDecision = 'RESTOCK' | 'DISCARD';

export type ReturnReceiptLine = {
  id: string;
  itemId: string;
  outboundLineId?: string | null;
  item: {
    id: string;
    itemCode: string;
    itemName: string;
  };
  storageType: StorageType;
  expiryDate: string | null;
  qty: number;
  decision: ReturnLineDecision | null;
  decidedAt: string | null;
  processedAt: string | null;
};

export type ReturnReceipt = {
  id: string;
  receiptNo?: number;
  outboundOrderId?: string | null;
  status: ReturnStatus;
  receivedAt: string;
  memo: string | null;
  customer: {
    id: string;
    name?: string;
    customerName?: string;
    code?: string;
  } | null;
  lines: ReturnReceiptLine[];
};

export type ReturnsActionRole = UserRole;
