import { httpClient } from '@/shared/api/http-client';

export type LotHistoryInventoryEntry = {
  id: string;
  type: string;
  createdAt: string;
  qtyDelta: number;
  warehouse: { id: string; name: string; type: string; region: string };
  refType: string | null;
  refId: string | null;
  memo: string | null;
  actorUser: { id: string; name: string; email: string } | null;
};

export type LotHistoryPickEntry = {
  id: string;
  createdAt: string;
  qty: number;
  pickedQty: number;
  warehouse: { id: string; name: string; type: string; region: string };
  isReleased: boolean;
  isCommitted: boolean;
  orderNo: number;
  orderId: string;
  orderStatus: string;
  customerName: string;
};

export type LotHistoryTransferEntry = {
  id: string;
  transferId: string;
  createdAt: string;
  confirmedAt: string | null;
  qty: number;
  status: string;
  fromWarehouse: { id: string; name: string; type: string; region: string };
  toWarehouse: { id: string; name: string; type: string; region: string };
};

export type LotHistoryResponse = {
  lot: {
    id: string;
    itemCode: string;
    itemName: string;
    expiryDate: string | null;
    createdAt: string;
  };
  inventoryHistory: LotHistoryInventoryEntry[];
  pickHistory: LotHistoryPickEntry[];
  transferHistory: LotHistoryTransferEntry[];
};

export async function getLotHistory(lotId: string): Promise<LotHistoryResponse> {
  const res = await httpClient.get<LotHistoryResponse>(`/traceability/lot/${lotId}`);
  return res.data;
}

export async function exportLotHistory(lotId: string): Promise<Blob> {
  const res = await httpClient.get(`/traceability/lot/${lotId}/export`, {
    responseType: 'blob',
  });
  return res.data as Blob;
}
