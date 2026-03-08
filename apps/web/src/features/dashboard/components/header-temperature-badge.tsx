'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTodayRecordedStatus } from '@/features/temperature-monitor/api/temperature-monitor.api';
import { temperatureMonitorKeys } from '@/features/temperature-monitor/lib/query-keys';
import { Thermometer } from 'lucide-react';

type HeaderTemperatureBadgeProps = {
  canRecord: boolean;
};

/** 오늘 COOL/FRZ 온도 기록 여부 배지 - 미기록 시 강조 (ADMIN/WH_MANAGER에게 표시) */
export function HeaderTemperatureBadge({ canRecord }: HeaderTemperatureBadgeProps) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: temperatureMonitorKeys.todayRecorded(),
    queryFn: getTodayRecordedStatus,
    enabled: canRecord,
    staleTime: 2 * 60 * 1000,
  });

  const recorded = data?.recorded ?? false;

  if (!canRecord || isLoading) return null;

  if (recorded) {
    return (
      <Link
        href="/temperature-monitor"
        className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
        title="오늘 온도 기록 완료"
      >
        <Thermometer className="h-3.5 w-3.5" />
        <span>오늘 기록함 ✓</span>
      </Link>
    );
  }

  return (
    <Link
      href="/temperature-monitor"
      className="flex items-center gap-1.5 rounded-lg border-2 border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 shadow-sm transition-all hover:border-amber-400 hover:bg-amber-100"
      title="오늘 COOL/FRZ 온도를 기록해주세요 (매일 필수)"
      onClick={() => {
        void queryClient.invalidateQueries({ queryKey: temperatureMonitorKeys.all });
      }}
    >
      <Thermometer className="h-3.5 w-3.5" />
      <span>오늘 온도 기록 필요</span>
    </Link>
  );
}
