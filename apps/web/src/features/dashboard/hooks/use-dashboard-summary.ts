'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { getDashboardSummary } from '@/features/dashboard/api/dashboard.api';
import { getErrorMessage } from '@/shared/utils/get-error-message';
import { dashboardKeys } from '@/features/dashboard/lib/query-keys';
import type {
  DashboardAnalyticsRange,
  DashboardSegmentBy,
} from '@/features/dashboard/model/types';
import { useToast } from '@/shared/ui/toast/toast-provider';

const SUMMARY_STALE_MS = 30_000;
const AUTO_REFRESH_MS = 60_000;

export type UseDashboardSummaryOptions = {
  range: DashboardAnalyticsRange;
  segmentBy: DashboardSegmentBy;
};

export function useDashboardSummary({ range, segmentBy }: UseDashboardSummaryOptions) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const queryResult = useQuery({
    queryKey: dashboardKeys.summary(range, segmentBy),
    queryFn: () => getDashboardSummary(range, segmentBy),
    staleTime: SUMMARY_STALE_MS,
    refetchInterval: () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        return AUTO_REFRESH_MS;
      }
      return false;
    },
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (queryResult.isError && queryResult.error) {
      showToast(
        getErrorMessage(
          queryResult.error,
          '대시보드 집계를 불러오지 못했습니다.',
        ),
        'error',
      );
    }
  }, [queryResult.isError, queryResult.error, showToast]);

  const refresh = useCallback(
    async (force = false) => {
      if (force) {
        try {
          const data = await getDashboardSummary(range, segmentBy, { noCache: true });
          queryClient.setQueryData(dashboardKeys.summary(range, segmentBy), data);
        } catch (error) {
          showToast(
            getErrorMessage(error, '대시보드 집계를 불러오지 못했습니다.'),
            'error',
          );
        }
      } else {
        await queryResult.refetch();
      }
    },
    [queryResult, queryClient, range, segmentBy, showToast],
  );

  return {
    data: queryResult.data ?? null,
    loading: queryResult.isFetching,
    range,
    segmentBy,
    refresh,
    autoRefreshMs: AUTO_REFRESH_MS,
  };
}
