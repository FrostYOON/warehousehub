'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { getDashboardSummary } from '@/features/dashboard/api/dashboard.api';
import type {
  DashboardAnalyticsRange,
  DashboardSegmentBy,
  DashboardSummaryResponse,
} from '@/features/dashboard/model/types';
import { useToast } from '@/shared/ui/toast/toast-provider';

const SUMMARY_TTL_MS = 30_000;
const AUTO_REFRESH_MS = 60_000;
const summaryCache = new Map<string, { data: DashboardSummaryResponse; cachedAt: number }>();
const LS_KEY = 'dashboard.summary.filters.v1';
const RANGE_VALUES: DashboardAnalyticsRange[] = ['WEEK', 'QUARTER', 'HALF', 'YEAR'];
const SEGMENT_VALUES: DashboardSegmentBy[] = ['WAREHOUSE_TYPE', 'CUSTOMER'];

function errorMessageFromUnknown(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as { message?: string | string[] };
    if (Array.isArray(payload?.message)) {
      return payload.message[0] ?? '대시보드 집계를 불러오지 못했습니다.';
    }
    return payload?.message ?? '대시보드 집계를 불러오지 못했습니다.';
  }
  return '대시보드 집계를 불러오지 못했습니다.';
}

type UseDashboardSummaryOptions = {
  initialRange?: DashboardAnalyticsRange;
  initialSegmentBy?: DashboardSegmentBy;
};

function isRange(value?: string | null): value is DashboardAnalyticsRange {
  return Boolean(value && RANGE_VALUES.includes(value as DashboardAnalyticsRange));
}

function isSegment(value?: string | null): value is DashboardSegmentBy {
  return Boolean(value && SEGMENT_VALUES.includes(value as DashboardSegmentBy));
}

export function useDashboardSummary(options?: UseDashboardSummaryOptions) {
  const { showToast } = useToast();
  const [range, setRange] = useState<DashboardAnalyticsRange>(options?.initialRange ?? 'QUARTER');
  const [segmentBy, setSegmentBy] = useState<DashboardSegmentBy>(
    options?.initialSegmentBy ?? 'WAREHOUSE_TYPE',
  );
  const [data, setData] = useState<DashboardSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        range?: DashboardAnalyticsRange;
        segmentBy?: DashboardSegmentBy;
      };
      if (!isRange(options?.initialRange) && isRange(parsed.range)) setRange(parsed.range);
      if (!isSegment(options?.initialSegmentBy) && isSegment(parsed.segmentBy)) {
        setSegmentBy(parsed.segmentBy);
      }
    } catch {
      // ignore storage parse errors
    }
  }, [options?.initialRange, options?.initialSegmentBy]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        LS_KEY,
        JSON.stringify({ range, segmentBy }),
      );
    } catch {
      // ignore storage write errors
    }
  }, [range, segmentBy]);

  const refresh = useCallback(async (force = false) => {
    const cacheKey = `${range}|${segmentBy}`;
    const cache = summaryCache.get(cacheKey);
    const now = Date.now();
    if (!force && cache && now - cache.cachedAt < SUMMARY_TTL_MS) {
      setData(cache.data);
      return;
    }

    setLoading(true);
    try {
      const summary = await getDashboardSummary(range, segmentBy);
      summaryCache.set(cacheKey, { data: summary, cachedAt: Date.now() });
      setData(summary);
    } catch (error) {
      showToast(errorMessageFromUnknown(error), 'error');
    } finally {
      setLoading(false);
    }
  }, [range, segmentBy, showToast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refresh(true);
      }
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return {
    data,
    loading,
    range,
    segmentBy,
    setRange,
    setSegmentBy,
    refresh,
    autoRefreshMs: AUTO_REFRESH_MS,
  };
}
