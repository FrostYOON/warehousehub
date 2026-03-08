import { httpClient } from '@/shared/api/http-client';
import type {
  DashboardAnalyticsRange,
  DashboardSegmentBy,
  DashboardSummaryResponse,
} from '@/features/dashboard/model/types';

export type DashboardPrefs = {
  widgetOrder: string[];
  widgetVisibility: Record<string, boolean>;
  widgetCollapsed: Record<string, boolean>;
};

export type UpdateDashboardPrefsPayload = {
  widgetOrder?: string[];
  widgetVisibility?: Record<string, boolean>;
  widgetCollapsed?: Record<string, boolean>;
};

export async function getDashboardPrefs(): Promise<DashboardPrefs> {
  const res = await httpClient.get<DashboardPrefs>('/dashboard/prefs');
  return res.data;
}

export async function updateDashboardPrefs(
  payload: UpdateDashboardPrefsPayload,
): Promise<DashboardPrefs> {
  const res = await httpClient.patch<DashboardPrefs>('/dashboard/prefs', payload);
  return res.data;
}

export async function getDashboardSummary(
  range: DashboardAnalyticsRange,
  segmentBy: DashboardSegmentBy,
  options?: { noCache?: boolean },
): Promise<DashboardSummaryResponse> {
  const params: Record<string, string> = { range, segmentBy };
  const headers = options?.noCache
    ? { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
    : undefined;
  const res = await httpClient.get<DashboardSummaryResponse>('/dashboard/summary', {
    params,
    headers,
  });
  return res.data;
}
