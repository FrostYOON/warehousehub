import { httpClient } from '@/shared/api/http-client';

export type StocktakingLine = {
  id: string;
  lotId: string;
  systemQty: number;
  actualQty: number | null;
  lot: {
    id: string;
    expiryDate: string | null;
    item: { itemCode: string; itemName: string };
  };
};

export type Stocktaking = {
  id: string;
  warehouseId: string;
  warehouse: { id: string; name: string; type: string };
  status: string;
  memo: string | null;
  lines: StocktakingLine[];
  createdAt: string;
  updatedAt: string;
};

export type StocktakingListItem = {
  id: string;
  warehouseId: string;
  warehouse: { id: string; name: string; type: string };
  status: string;
  memo: string | null;
  _count: { lines: number };
  createdAt: string;
};

export type StocktakingListResponse = {
  items: StocktakingListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type WarehouseOption = {
  id: string;
  name: string;
  type: string;
};

export type LotOption = {
  id: string;
  expiryDate: string | null;
  item: { itemCode: string; itemName: string };
};

export async function getWarehouses(): Promise<WarehouseOption[]> {
  const res = await httpClient.get<WarehouseOption[]>('/warehouses');
  return res.data;
}

export async function getStocksForWarehouse(warehouseId: string): Promise<
  Array<{
    id: string;
    lotId: string;
    onHand: number;
    lot: LotOption;
  }>
> {
  const res = await httpClient.get<{
    items: Array<{
      id: string;
      lotId?: string;
      onHand: number;
      lot: LotOption;
    }>;
  }>('/stocks', {
    params: { warehouseId, pageSize: 500 },
  });
  const items = res.data?.items ?? [];
  return items.map((row) => ({
    id: row.id,
    lotId: row.lot.id,
    onHand: row.onHand,
    lot: row.lot,
  }));
}

/** getStocksForWarehouse 별칭 (재고 실사 페이지용) */
export const getStocks = getStocksForWarehouse;

export async function createStocktaking(payload: {
  warehouseId: string;
  memo?: string;
}): Promise<Stocktaking> {
  const res = await httpClient.post<Stocktaking>('/stocktaking', payload);
  return res.data;
}

export async function listStocktaking(params?: {
  status?: string;
  warehouseId?: string;
  page?: number;
  pageSize?: number;
}): Promise<StocktakingListResponse> {
  const query: Record<string, string | number> = {};
  if (params?.status) query.status = params.status;
  if (params?.warehouseId) query.warehouseId = params.warehouseId;
  if (params?.page) query.page = params.page;
  if (params?.pageSize) query.pageSize = params.pageSize;
  const res = await httpClient.get<StocktakingListResponse>('/stocktaking', {
    params: query,
  });
  return res.data;
}

export async function getStocktaking(id: string): Promise<Stocktaking> {
  const res = await httpClient.get<Stocktaking>(`/stocktaking/${id}`);
  return res.data;
}

export async function addStocktakingLines(
  id: string,
  lines: Array<{ lotId: string }>,
): Promise<Stocktaking> {
  const res = await httpClient.patch<Stocktaking>(`/stocktaking/${id}/lines`, {
    lines,
  });
  return res.data;
}

export async function updateStocktakingLineActualQty(
  id: string,
  lineId: string,
  actualQty: number,
): Promise<Stocktaking> {
  const res = await httpClient.patch<Stocktaking>(
    `/stocktaking/${id}/lines/${lineId}`,
    { actualQty },
  );
  return res.data;
}

export async function confirmStocktaking(id: string): Promise<Stocktaking> {
  const res = await httpClient.patch<Stocktaking>(`/stocktaking/${id}/confirm`);
  return res.data;
}
