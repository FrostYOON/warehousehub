import { httpClient } from '@/shared/api/http-client';
import type { StockRow, StocksQuery } from '@/features/stocks/model/types';

export async function getStocks(query: StocksQuery = {}): Promise<StockRow[]> {
  const params = new URLSearchParams();
  if (query.storageType) params.set('storageType', query.storageType);
  if (query.itemCode?.trim()) params.set('itemCode', query.itemCode.trim());

  const res = await httpClient.get<StockRow[]>('/stocks', {
    params,
  });
  return res.data;
}
