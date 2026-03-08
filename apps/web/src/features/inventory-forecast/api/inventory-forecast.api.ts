import { httpClient } from '@/shared/api/http-client';

export type DemandForecastParams = {
  lookbackDays?: number;
  forecastDays?: number;
  itemId?: string;
  page?: number;
  pageSize?: number;
};

export type DemandForecastItem = {
  itemId: string;
  itemCode: string;
  itemName: string;
  totalOutboundQty: number;
  avgDailyOutbound: number;
  forecastedDemand: number;
  activeDays: number;
};

export type DemandForecastResponse = {
  items: DemandForecastItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  params: {
    lookbackDays: number;
    forecastDays: number;
    startDate: string;
    endDate: string;
  };
};

export async function getDemandForecast(
  params?: DemandForecastParams,
): Promise<DemandForecastResponse> {
  const searchParams = new URLSearchParams();
  if (params?.lookbackDays) searchParams.set('lookbackDays', String(params.lookbackDays));
  if (params?.forecastDays) searchParams.set('forecastDays', String(params.forecastDays));
  if (params?.itemId) searchParams.set('itemId', params.itemId);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  const qs = searchParams.toString();
  const url = qs ? `/inventory-forecast/demand?${qs}` : '/inventory-forecast/demand';
  const res = await httpClient.get<DemandForecastResponse>(url);
  return res.data;
}

export type ReorderSuggestionParams = {
  lookbackDays?: number;
  leadTimeDays?: number;
  safetyStock?: number;
  itemId?: string;
  page?: number;
  pageSize?: number;
};

export type ReorderSuggestionItem = {
  itemId: string;
  itemCode: string;
  itemName: string;
  currentStock: number;
  avgDailyOutbound: number;
  leadTimeDemand: number;
  reorderPoint: number;
  suggestedQty: number;
  urgency: 'low' | 'medium' | 'critical';
};

export type ReorderSuggestionsResponse = {
  items: ReorderSuggestionItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  params: {
    lookbackDays: number;
    leadTimeDays: number;
    safetyStock: number;
  };
};

export async function getReorderSuggestions(
  params?: ReorderSuggestionParams,
): Promise<ReorderSuggestionsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.lookbackDays) searchParams.set('lookbackDays', String(params.lookbackDays));
  if (params?.leadTimeDays) searchParams.set('leadTimeDays', String(params.leadTimeDays));
  if (params?.safetyStock != null) searchParams.set('safetyStock', String(params.safetyStock));
  if (params?.itemId) searchParams.set('itemId', params.itemId);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  const qs = searchParams.toString();
  const url = qs
    ? `/inventory-forecast/reorder-suggestions?${qs}`
    : '/inventory-forecast/reorder-suggestions';
  const res = await httpClient.get<ReorderSuggestionsResponse>(url);
  return res.data;
}
