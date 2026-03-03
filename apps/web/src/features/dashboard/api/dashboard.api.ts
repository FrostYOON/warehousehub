import { httpClient } from '@/shared/api/http-client';
import type {
  DashboardAnalyticsRange,
  DashboardSegmentBy,
  DashboardSummaryResponse,
} from '@/features/dashboard/model/types';

export async function getDashboardSummary(
  range: DashboardAnalyticsRange,
  segmentBy: DashboardSegmentBy,
): Promise<DashboardSummaryResponse> {
  const res = await httpClient.get<DashboardSummaryResponse>('/dashboard/summary', {
    params: { range, segmentBy },
  });
  return res.data;
}
