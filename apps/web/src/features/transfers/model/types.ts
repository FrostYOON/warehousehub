export type TransferStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export type TransferLine = {
  id: string;
  lotId: string;
  qty: number;
  lot: {
    id: string;
    expiryDate: string | null;
    item: { itemCode: string; itemName: string };
  };
};

export type Transfer = {
  id: string;
  status: TransferStatus;
  memo: string | null;
  fromWarehouse: { id: string; name: string; type: string };
  toWarehouse: { id: string; name: string; type: string };
  lines: TransferLine[];
  createdAt: string;
  confirmedAt: string | null;
};

export type TransfersListResponse = {
  items: Transfer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
