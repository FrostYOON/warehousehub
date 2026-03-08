import { httpClient } from '@/shared/api/http-client';
import type {
  DashboardAnalyticsRange,
  DashboardSegmentBy,
  DashboardSummaryResponse,
} from '@/features/dashboard/model/types';

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
