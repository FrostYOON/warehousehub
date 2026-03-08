'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Thermometer } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTemperatureLog,
  getTemperatureStats,
  listTemperatureLogs,
  getTodayRecordedStatus,
} from '@/features/temperature-monitor/api/temperature-monitor.api';
import { temperatureMonitorKeys } from '@/features/temperature-monitor/lib/query-keys';
import type {
  TemperatureStatsGroupBy,
  TemperatureStatsSeriesPoint,
} from '@/features/temperature-monitor/model/types';
import { useAuthSession } from '@/features/auth';
import { canAccessTemperatureMonitor } from '@/features/auth/model/role-policy';
import { ActionButton } from '@/shared/ui/common/action-button';
import { useToast } from '@/shared/ui/toast/toast-provider';
import { getErrorMessage } from '@/shared/utils/get-error-message';
import { format } from 'date-fns';

const COOL_MIN = 2;
const COOL_MAX = 8;
const FRZ_MAX = -18;

function checkCoolOk(temp: number | null | undefined): boolean | null {
  if (temp == null || Number.isNaN(temp)) return null;
  return temp >= COOL_MIN && temp <= COOL_MAX;
}

function checkFrzOk(temp: number | null | undefined): boolean | null {
  if (temp == null || Number.isNaN(temp)) return null;
  return temp <= FRZ_MAX;
}

function formatLabel(bucket: string, groupBy: TemperatureStatsGroupBy): string {
  if (groupBy === 'HOUR') {
    try {
      const d = new Date(bucket);
      return format(d, 'MM/dd HH:00');
    } catch {
      return bucket;
    }
  }
  if (groupBy === 'MONTH') {
    try {
      const [y, m] = bucket.split('-');
      return `${y}년 ${m}월`;
    } catch {
      return bucket;
    }
  }
  return bucket;
}

/** 피어슨 상관계수 (외부날씨 vs COOL/FRZ) */
function computeCorrelation(
  series: TemperatureStatsSeriesPoint[],
  keyA: 'avgWeatherTemp' | 'avgCoolTemp' | 'avgFrzTemp',
  keyB: 'avgWeatherTemp' | 'avgCoolTemp' | 'avgFrzTemp',
): number | null {
  const pairs = series
    .map((s) => {
      const a = s[keyA];
      const b = s[keyB];
      if (a == null || b == null) return null;
      return [a, b] as [number, number];
    })
    .filter((p): p is [number, number] => p != null);
  if (pairs.length < 3) return null;
  const n = pairs.length;
  const sumX = pairs.reduce((s, [x]) => s + x, 0);
  const sumY = pairs.reduce((s, [, y]) => s + y, 0);
  const sumXY = pairs.reduce((s, [x, y]) => s + x * y, 0);
  const sumX2 = pairs.reduce((s, [x]) => s + x * x, 0);
  const sumY2 = pairs.reduce((s, [, y]) => s + y * y, 0);
  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (den === 0) return null;
  return Math.round((num / den) * 100) / 100;
}

export default function TemperatureMonitorPage() {
  const { me } = useAuthSession();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [coolTemp, setCoolTemp] = useState('');
  const [frzTemp, setFrzTemp] = useState('');
  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statsFrom, setStatsFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [statsTo, setStatsTo] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [statsGroupBy, setStatsGroupBy] =
    useState<TemperatureStatsGroupBy>('DAY');

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: temperatureMonitorKeys.stats(statsFrom, statsTo, statsGroupBy),
    queryFn: () => getTemperatureStats({ from: statsFrom, to: statsTo, groupBy: statsGroupBy }),
    staleTime: 60 * 1000,
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: temperatureMonitorKeys.logs(1, 10),
    queryFn: () => listTemperatureLogs({ page: 1, pageSize: 10 }),
  });

  const { data: todayRecorded } = useQuery({
    queryKey: temperatureMonitorKeys.todayRecorded(),
    queryFn: getTodayRecordedStatus,
    staleTime: 2 * 60 * 1000,
  });

  const handleSubmit = useCallback(async () => {
    const cool = coolTemp.trim() ? Number(coolTemp) : undefined;
    const frz = frzTemp.trim() ? Number(frzTemp) : undefined;
    if (cool == null && frz == null) {
      showToast('COOL 또는 FRZ 온도를 하나 이상 입력해주세요.', 'error');
      return;
    }
    if (cool != null && (Number.isNaN(cool) || cool < -50 || cool > 50)) {
      showToast('COOL 온도는 -50~50°C 범위여야 합니다.', 'error');
      return;
    }
    if (frz != null && (Number.isNaN(frz) || frz < -50 || frz > 50)) {
      showToast('FRZ 온도는 -50~50°C 범위여야 합니다.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await createTemperatureLog({
        coolTemp: cool,
        frzTemp: frz,
        memo: memo.trim() || undefined,
      });
      showToast('온도 기록이 저장되었습니다.', 'success');
      setCoolTemp('');
      setFrzTemp('');
      setMemo('');
      void queryClient.invalidateQueries({ queryKey: temperatureMonitorKeys.all });
    } catch (error) {
      showToast(getErrorMessage(error, '저장에 실패했습니다.'), 'error');
    } finally {
      setSubmitting(false);
    }
  }, [coolTemp, frzTemp, memo, showToast, queryClient]);

  const coolOk = useMemo(() => checkCoolOk(coolTemp ? Number(coolTemp) : null), [coolTemp]);
  const frzOk = useMemo(() => checkFrzOk(frzTemp ? Number(frzTemp) : null), [frzTemp]);

  const chartData = useMemo((): TemperatureStatsSeriesPoint[] => {
    if (!stats?.series?.length) return [];
    return stats.series.map((s) => ({
      ...s,
      label: formatLabel(s.bucket, stats.groupBy),
    }));
  }, [stats]);

  const statsSummary = useMemo(() => {
    if (!stats?.series?.length) return null;
    let coolOkTotal = 0;
    let coolOkCnt = 0;
    let frzOkTotal = 0;
    let frzOkCnt = 0;
    let weatherSum = 0;
    let weatherCnt = 0;
    let coolSum = 0;
    let coolCnt = 0;
    let frzSum = 0;
    let frzCnt = 0;
    for (const s of stats.series) {
      if (s.coolOkRate != null) {
        coolOkTotal += s.count;
        coolOkCnt += s.count * (s.coolOkRate / 100);
      }
      if (s.frzOkRate != null) {
        frzOkTotal += s.count;
        frzOkCnt += s.count * (s.frzOkRate / 100);
      }
      if (s.avgWeatherTemp != null) {
        weatherSum += s.avgWeatherTemp * s.count;
        weatherCnt += s.count;
      }
      if (s.avgCoolTemp != null) {
        coolSum += s.avgCoolTemp * s.count;
        coolCnt += s.count;
      }
      if (s.avgFrzTemp != null) {
        frzSum += s.avgFrzTemp * s.count;
        frzCnt += s.count;
      }
    }
    const avgWeather = weatherCnt > 0 ? weatherSum / weatherCnt : null;
    const avgCool = coolCnt > 0 ? coolSum / coolCnt : null;
    const avgFrz = frzCnt > 0 ? frzSum / frzCnt : null;
    let correlation = 0;
    if (weatherCnt > 1 && coolCnt > 1 && avgWeather != null && avgCool != null) {
      let sumXy = 0;
      let sumX2 = 0;
      let sumY2 = 0;
      for (const s of stats.series) {
        if (s.avgWeatherTemp != null && s.avgCoolTemp != null) {
          const x = s.avgWeatherTemp - avgWeather;
          const y = s.avgCoolTemp - avgCool;
          sumXy += x * y * s.count;
          sumX2 += x * x * s.count;
          sumY2 += y * y * s.count;
        }
      }
      const denom = Math.sqrt(sumX2 * sumY2);
      correlation = denom > 0 ? sumXy / denom : 0;
    }
    return {
      coolOkRate: coolOkTotal > 0 ? Math.round((coolOkCnt / coolOkTotal) * 1000) / 10 : null,
      frzOkRate: frzOkTotal > 0 ? Math.round((frzOkCnt / frzOkTotal) * 1000) / 10 : null,
      correlation: Math.round(correlation * 100) / 100,
    };
  }, [stats]);

  const canCreateLog = canAccessTemperatureMonitor(me?.role);

  const hasRecordedToday = todayRecorded?.recorded ?? false;

  return (
    <div className="space-y-6">
      {canCreateLog && hasRecordedToday && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          ✓ 오늘 COOL/FRZ 온도 기록 완료
        </div>
      )}
      {canCreateLog && todayRecorded !== undefined && !hasRecordedToday && (
        <div className="rounded-lg border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          ⚠ 매일 필수: 오늘 COOL/FRZ 온도를 기록해주세요.
        </div>
      )}
      <section className="page-section">
        <h2 className="page-title">온도·날씨 모니터링</h2>
        <p className="page-description">
          COOL(냉장 2~8°C)/FRZ(냉동 -18°C 이하) 온도 기입 및 통계를 확인합니다. 날씨는 헤더에서 확인할 수 있습니다.
        </p>

        <div className="mt-6">
          {/* COOL/FRZ 온도 입력 폼 */}
          <article className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Thermometer className="h-4 w-4 text-blue-500" />
              온도 기입 (COOL / FRZ)
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-800">매일 필수</span>
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  COOL 냉장 (°C) — 적정: 2~8
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="-50"
                  max="50"
                  value={coolTemp}
                  onChange={(e) => setCoolTemp(e.target.value)}
                  placeholder="예: 5"
                  className="form-input w-full max-w-[120px]"
                />
                {coolOk !== null && (
                  <span
                    className={`ml-2 text-xs font-medium ${coolOk ? 'text-emerald-600' : 'text-red-600'}`}
                  >
                    {coolOk ? '✓ 적정' : '✗ 부적정'}
                  </span>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  FRZ 냉동 (°C) — 적정: -18 이하
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="-50"
                  max="50"
                  value={frzTemp}
                  onChange={(e) => setFrzTemp(e.target.value)}
                  placeholder="예: -20"
                  className="form-input w-full max-w-[120px]"
                />
                {frzOk !== null && (
                  <span
                    className={`ml-2 text-xs font-medium ${frzOk ? 'text-emerald-600' : 'text-red-600'}`}
                  >
                    {frzOk ? '✓ 적정' : '✗ 부적정'}
                  </span>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  메모 (선택)
                </label>
                <input
                  type="text"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="메모"
                  className="form-input w-full"
                  maxLength={500}
                />
              </div>
              {canCreateLog && (
                <ActionButton
                  onClick={() => void handleSubmit()}
                  disabled={submitting}
                  size="md"
                >
                  {submitting ? '저장 중...' : '기록 저장'}
                </ActionButton>
              )}
            </div>
          </article>
        </div>
      </section>

      {/* 통계 차트 */}
      <section className="page-section">
        <h3 className="page-subtitle mb-4">온도·날씨 통계</h3>
        {statsSummary && (
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs font-medium text-slate-500">COOL 적정률</p>
              <p className="text-lg font-bold text-slate-800">
                {statsSummary.coolOkRate != null ? `${statsSummary.coolOkRate}%` : '-'}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs font-medium text-slate-500">FRZ 적정률</p>
              <p className="text-lg font-bold text-slate-800">
                {statsSummary.frzOkRate != null ? `${statsSummary.frzOkRate}%` : '-'}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 sm:col-span-2">
              <p className="text-xs font-medium text-slate-500">외부날씨 ↔ COOL 상관관계</p>
              <p className="text-lg font-bold text-slate-800">
                {statsSummary.correlation != null && !Number.isNaN(statsSummary.correlation)
                  ? statsSummary.correlation.toFixed(2)
                  : '-'}
              </p>
            </div>
          </div>
        )}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={statsFrom}
            onChange={(e) => setStatsFrom(e.target.value)}
            className="form-input h-9 w-[140px]"
          />
          <span className="text-slate-400">~</span>
          <input
            type="date"
            value={statsTo}
            onChange={(e) => setStatsTo(e.target.value)}
            className="form-input h-9 w-[140px]"
          />
          <select
            value={statsGroupBy}
            onChange={(e) => setStatsGroupBy(e.target.value as TemperatureStatsGroupBy)}
            className="form-select h-9 w-[100px]"
          >
            <option value="HOUR">시간별</option>
            <option value="DAY">일별</option>
            <option value="MONTH">월별</option>
          </select>
        </div>
        {statsSummary && (
          <div className="mb-4 flex flex-wrap gap-4">
            {statsSummary.coolOkRate != null && (
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-2">
                <span className="text-xs text-slate-500">COOL 적정률</span>
                <p className="text-lg font-semibold text-slate-800">{statsSummary.coolOkRate}%</p>
              </div>
            )}
            {statsSummary.frzOkRate != null && (
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-2">
                <span className="text-xs text-slate-500">FRZ 적정률</span>
                <p className="text-lg font-semibold text-slate-800">{statsSummary.frzOkRate}%</p>
              </div>
            )}
            {stats?.series && stats.series.length >= 3 && (
              (() => {
                const corr = computeCorrelation(stats.series, 'avgWeatherTemp', 'avgCoolTemp');
                if (corr != null) {
                  return (
                    <div className="rounded-lg border border-slate-200 bg-white px-4 py-2" title="외부날씨 vs COOL 냉장 상관계수">
                      <span className="text-xs text-slate-500">외부날씨↔COOL 상관</span>
                      <p className="text-lg font-semibold text-slate-800">{corr}</p>
                    </div>
                  );
                }
                return null;
              })()
            )}
          </div>
        )}
        {statsLoading ? (
          <div className="flex h-[280px] items-center justify-center text-slate-500">
            통계를 불러오는 중...
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
            해당 기간 데이터가 없습니다.
          </div>
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}°C`}
                />
                <Tooltip
                  formatter={(value: number) => [`${value}°C`, '']}
                  labelFormatter={(label) => label}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="avgWeatherTemp"
                  name="외부날씨"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="avgCoolTemp"
                  name="COOL 냉장"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="avgFrzTemp"
                  name="FRZ 냉동"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* 최근 로그 */}
      <section className="page-section">
        <h3 className="page-subtitle mb-4">최근 온도 기록</h3>
        {logsLoading ? (
          <p className="text-sm text-slate-500">불러오는 중...</p>
        ) : !logsData?.items?.length ? (
          <p className="empty-state-text">기록이 없습니다.</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table min-w-[600px]">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">
                    기록 시각
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">
                    COOL
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">
                    FRZ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">
                    날씨
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">
                    기입자
                  </th>
                </tr>
              </thead>
              <tbody>
                {logsData.items.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {log.coolTemp != null ? (
                        <span
                          className={
                            log.coolOk
                              ? 'text-emerald-600'
                              : log.coolOk === false
                                ? 'text-red-600'
                                : ''
                          }
                        >
                          {log.coolTemp}°C {log.coolOk === true ? '✓' : log.coolOk === false ? '✗' : ''}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {log.frzTemp != null ? (
                        <span
                          className={
                            log.frzOk
                              ? 'text-emerald-600'
                              : log.frzOk === false
                                ? 'text-red-600'
                                : ''
                          }
                        >
                          {log.frzTemp}°C {log.frzOk === true ? '✓' : log.frzOk === false ? '✗' : ''}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {log.weatherTemp != null ? `${log.weatherTemp}°C` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {log.recordedBy?.name ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
