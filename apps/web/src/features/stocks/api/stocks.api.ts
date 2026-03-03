import { httpClient } from '@/shared/api/http-client';
import type {
  ItemAnalyticsRange,
  StockItemOption,
  StockItemTrend,
  StockRow,
  StocksListResponse,
  StocksQuery,
} from '@/features/stocks/model/types';

export async function getStocks(query: StocksQuery = {}): Promise<StocksListResponse> {
  const params = new URLSearchParams();
  if (query.storageType) params.set('storageType', query.storageType);
  if (query.itemCode?.trim()) params.set('itemCode', query.itemCode.trim());
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));

  const res = await httpClient.get<StocksListResponse>('/stocks', {
    params,
  });
  return res.data;
}

export async function getStockItems(keyword?: string): Promise<StockItemOption[]> {
  const params = new URLSearchParams();
  if (keyword?.trim()) params.set('keyword', keyword.trim());

  const res = await httpClient.get<StockItemOption[]>('/stocks/items', { params });
  return res.data;
}

export async function getStockItemTrend(
  itemId: string,
  range: ItemAnalyticsRange,
): Promise<StockItemTrend> {
  const res = await httpClient.get<StockItemTrend>(`/stocks/analytics/${itemId}`, {
    params: { range },
  });
  return res.data;
}

export async function updateStock(
  stockId: string,
  payload: { onHand: number; reserved: number; memo?: string },
): Promise<StockRow> {
  const res = await httpClient.patch<StockRow>(`/stocks/${stockId}`, payload);
  return res.data;
}

export async function exportStocks(query: StocksQuery = {}): Promise<Blob> {
  const params = new URLSearchParams();
  if (query.storageType) params.set('storageType', query.storageType);
  if (query.itemCode?.trim()) params.set('itemCode', query.itemCode.trim());
  const res = await httpClient.get('/stocks/export', {
    params,
    responseType: 'blob',
  });
  return res.data as Blob;
}
