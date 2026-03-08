'use client';

import Link from 'next/link';
import { useMemo } from 'react';
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
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Tabs from '@radix-ui/react-tabs';
import * as RadixTooltip from '@radix-ui/react-tooltip';
import {
  Filter,
  FileDown,
  ChevronDown,
  ExternalLink,
  TrendingUp,
  Package,
  AlertTriangle,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Target,
} from 'lucide-react';
import type { AnalysisTab } from '@/features/dashboard/lib/dashboard-params';
import { cn } from '@/shared/utils/cn';
import { formatDecimalForDisplay } from '@/shared/utils/format-decimal';
import type {
  DashboardAnalyticsRange,
  DashboardAnomaly,
  DashboardItemAnalysis,
  DashboardSegmentBy,
  DashboardSummaryResponse,
  DashboardTrendPoint,
} from '@/features/dashboard/model/types';

const RANGE_LABEL: Record<DashboardAnalyticsRange, string> = {
  WEEK: '주간',
  QUARTER: '분기',
  HALF: '반기',
  YEAR: '연간',
};

const SEGMENT_LABEL: Record<DashboardSegmentBy, string> = {
  WAREHOUSE_TYPE: '창고타입',
  CUSTOMER: '고객사',
};

function abbreviateLabel(label: string): string {
  if (label.length <= 6) return label;
  const m = label.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[2]}/${m[3]}`;
  return label.slice(0, 6);
}

function analysisBarWidth(item: DashboardItemAnalysis, maxValue: number) {
  if (maxValue <= 0) return 0;
  return Math.max(4, Math.round((item.outboundQty / maxValue) * 100));
}

function formatRate(rate: number): string {
  const r = Math.round(rate * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

type TrendChartProps = {
  series: DashboardTrendPoint[];
};

function TrendChart({ series }: TrendChartProps) {
  if (series.length === 0) return null;

  const data = series.map((p) => ({
    name: abbreviateLabel(p.label),
    출고: p.outboundQty,
    리턴: p.returnQty,
  }));

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ name?: string; value?: number }>;
    label?: string;
  }) => {
    if (!active || !payload?.length || !label) return null;
    const point = series.find((p) => abbreviateLabel(p.label) === label);
    if (!point) return null;
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg">
        <p className="mb-2 font-medium text-slate-800">{point.label}</p>
        <p className="text-slate-600">출고: {formatDecimalForDisplay(point.outboundQty)}</p>
        <p className="text-slate-600">리턴: {formatDecimalForDisplay(point.returnQty)}</p>
        <p className="text-slate-500">리턴율: {formatRate(point.returnRate)}%</p>
      </div>
    );
  };

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
          />
          <Tooltip content={(props) => <CustomTooltip {...(props as Parameters<typeof CustomTooltip>[0])} />} />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value) => <span className="text-slate-600">{value}</span>}
          />
          <Line
            type="monotone"
            dataKey="출고"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3, fill: '#3b82f6' }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="리턴"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 3, fill: '#10b981' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

type AnalysisWidgetProps = {
  summary: DashboardSummaryResponse | null;
  loading?: boolean;
  range: DashboardAnalyticsRange;
  setRange: (value: DashboardAnalyticsRange) => void;
  segmentBy: DashboardSegmentBy;
  setSegmentBy: (value: DashboardSegmentBy) => void;
  tab: AnalysisTab;
  setTab: (value: AnalysisTab) => void;
  onDownloadCsv: () => void;
};

export function AnalysisWidget({
  summary,
  loading = false,
  range,
  setRange,
  segmentBy,
  setSegmentBy,
  tab,
  setTab,
  onDownloadCsv,
}: AnalysisWidgetProps) {
  const trendSeries = useMemo(() => summary?.analysis?.trendSeries ?? [], [summary?.analysis?.trendSeries]);
  const segmentComparison = summary?.analysis?.segmentComparison ?? [];
  const anomalies = summary?.analysis?.anomalies ?? [];
  const pareto = summary?.analysis?.pareto;
  const topOutbound = useMemo(() => summary?.analysis?.topOutboundItems ?? [], [summary?.analysis?.topOutboundItems]);
  const worstOutbound = summary?.analysis?.worstOutboundItems ?? [];
  const topReturnRate = useMemo(() => summary?.analysis?.topReturnRateItems ?? [], [summary?.analysis?.topReturnRateItems]);
  const targetLine = summary?.analysis?.targetLine ?? 2;
  const prevOutbound = summary?.analysis?.prevOutboundTotal ?? 0;
  const prevReturn = summary?.analysis?.prevReturnTotal ?? 0;

  const currOutboundTotal = useMemo(
    () => trendSeries.reduce((s, p) => s + p.outboundQty, 0),
    [trendSeries],
  );
  const currReturnTotal = useMemo(
    () => trendSeries.reduce((s, p) => s + p.returnQty, 0),
    [trendSeries],
  );
  const prevOutboundChange =
    prevOutbound > 0 ? ((currOutboundTotal - prevOutbound) / prevOutbound) * 100 : null;
  const prevReturnChange = prevReturn > 0 ? ((currReturnTotal - prevReturn) / prevReturn) * 100 : null;

  const maxOutbound = useMemo(
    () => topOutbound.reduce((max, item) => Math.max(max, item.outboundQty), 0),
    [topOutbound],
  );

  const buildOutboundLink = (query: Record<string, string>) => {
    const params = new URLSearchParams();
    params.set('statuses', 'DELIVERED');
    Object.entries(query).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return `/outbound?${params.toString()}`;
  };

  const renderAnomaly = (item: DashboardAnomaly) => (
    <Link
      key={item.itemId}
      href={buildOutboundLink(item.drilldownQuery.query)}
      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-slate-50"
      title={`현재 ${formatDecimalForDisplay(item.currentOutboundQty)} / 이전 ${formatDecimalForDisplay(item.previousOutboundQty)} / +${formatRate(item.growthRate)}%`}
    >
      <span className="truncate text-slate-700">{item.itemCode} {item.itemName}</span>
      <span className="shrink-0 font-medium text-amber-600">+{formatRate(item.growthRate)}%</span>
    </Link>
  );

  const renderParetoItem = (item: NonNullable<typeof pareto>['items'][number]) => (
    <Link
      key={`pareto-${item.itemId}`}
      href={buildOutboundLink(item.drilldownQuery.query)}
      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-slate-50"
      title={`리턴 ${formatDecimalForDisplay(item.returnQty)} / 누적 ${formatRate(item.cumulativeShare)}%`}
    >
      <span className="truncate text-slate-700">{item.itemCode} {item.itemName}</span>
      <span className="text-slate-600">{formatRate(item.cumulativeShare)}%</span>
    </Link>
  );

  const prevLabel =
    RANGE_LABEL[range] === '주간'
      ? '전주'
      : RANGE_LABEL[range] === '분기'
        ? '전분기'
        : RANGE_LABEL[range] === '반기'
          ? '전반기'
          : '전년';

  if (loading || !summary) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
        <p className="mt-3 text-sm">데이터를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-slate-600">
          <Filter className="h-4 w-4" />
          <span className="text-xs font-medium">필터</span>
        </span>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as DashboardAnalyticsRange)}
          className="h-9 w-[100px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300"
        >
          <option value="WEEK">주간</option>
          <option value="QUARTER">분기</option>
          <option value="HALF">반기</option>
          <option value="YEAR">연간</option>
        </select>
        <select
          value={segmentBy}
          onChange={(e) => setSegmentBy(e.target.value as DashboardSegmentBy)}
          className="h-9 w-[110px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300"
        >
          <option value="WAREHOUSE_TYPE">창고타입</option>
          <option value="CUSTOMER">고객사</option>
        </select>
        <Link
          href="/stocks"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 transition-colors hover:bg-slate-50"
        >
          <ExternalLink className="h-4 w-4" />
          재고 상세
        </Link>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 transition-colors hover:bg-slate-50"
              aria-label="내보내기"
            >
              <FileDown className="h-4 w-4" />
              내보내기
              <ChevronDown className="h-4 w-4" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content
            className="min-w-[180px] rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
            sideOffset={4}
            align="end"
          >
            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 outline-none hover:bg-slate-100 focus:bg-slate-100"
              onSelect={onDownloadCsv}
            >
              <FileDown className="h-4 w-4" />
              CSV로 내보내기
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>

      {/* 탭 */}
      <Tabs.Root value={tab} onValueChange={(v) => setTab(v as AnalysisTab)} className="space-y-4">
        <Tabs.List className="flex gap-0 border-b border-slate-200">
          <Tabs.Trigger
            value="trend"
            className={cn(
              'flex items-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm font-medium transition-colors',
              'data-[state=active]:border-slate-600 data-[state=active]:text-slate-900',
              'data-[state=inactive]:text-slate-500 data-[state=inactive]:hover:text-slate-700',
            )}
          >
            <TrendingUp className="h-4 w-4" />
            추세
          </Tabs.Trigger>
          <Tabs.Trigger
            value="compare"
            className={cn(
              'flex items-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm font-medium transition-colors',
              'data-[state=active]:border-slate-600 data-[state=active]:text-slate-900',
              'data-[state=inactive]:text-slate-500 data-[state=inactive]:hover:text-slate-700',
            )}
          >
            <BarChart3 className="h-4 w-4" />
            비교
          </Tabs.Trigger>
          <Tabs.Trigger
            value="items"
            className={cn(
              'flex items-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm font-medium transition-colors',
              'data-[state=active]:border-slate-600 data-[state=active]:text-slate-900',
              'data-[state=inactive]:text-slate-500 data-[state=inactive]:hover:text-slate-700',
            )}
          >
            <Package className="h-4 w-4" />
            품목
          </Tabs.Trigger>
        </Tabs.List>

        {/* 탭 1: 추세 */}
        <Tabs.Content value="trend" className="space-y-4 focus-visible:outline-none">
          {/* KPI */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <RadixTooltip.Root>
              <RadixTooltip.Trigger asChild>
                <article className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-slate-400" />
                    <p className="text-xs font-medium text-slate-500">총 출고량</p>
                  </div>
              <Link
                href={
                  trendSeries.length > 0
                    ? buildOutboundLink({
                        from: trendSeries[0].start.slice(0, 10),
                        to: trendSeries[trendSeries.length - 1].end.slice(0, 10),
                      })
                    : '/outbound'
                }
                className="mt-1 block text-xl font-bold tabular-nums text-slate-800 hover:text-blue-600"
              >
                {formatDecimalForDisplay(currOutboundTotal)}
              </Link>
              {prevOutboundChange !== null && (
                <p className="mt-1 flex items-center gap-0.5 text-xs text-slate-500">
                  {prevOutboundChange >= 0 ? (
                    <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5 text-red-600" />
                  )}
                  <span className={prevOutboundChange >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                    {prevLabel} {prevOutboundChange >= 0 ? '+' : ''}
                    {prevOutboundChange.toFixed(1)}%
                  </span>
                </p>
              )}
                </article>
              </RadixTooltip.Trigger>
              <RadixTooltip.Portal>
                <RadixTooltip.Content
                  className="max-w-[240px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-lg"
                  sideOffset={4}
                >
                  기간 내 출고 완료 수량 합계
                </RadixTooltip.Content>
              </RadixTooltip.Portal>
            </RadixTooltip.Root>
            <RadixTooltip.Root>
              <RadixTooltip.Trigger asChild>
                <article className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-slate-400" />
                    <p className="text-xs font-medium text-slate-500">총 리턴량</p>
                  </div>
              <p className="mt-1 text-xl font-bold tabular-nums text-slate-800">
                {formatDecimalForDisplay(currReturnTotal)}
              </p>
              {prevReturnChange !== null && (
                <p className="mt-1 flex items-center gap-0.5 text-xs text-slate-500">
                  {prevReturnChange >= 0 ? (
                    <ArrowUpRight className="h-3.5 w-3.5 text-red-600" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5 text-emerald-600" />
                  )}
                  <span className={prevReturnChange >= 0 ? 'text-red-600' : 'text-emerald-600'}>
                    {prevLabel} {prevReturnChange >= 0 ? '+' : ''}
                    {prevReturnChange.toFixed(1)}%
                  </span>
                </p>
              )}
                </article>
              </RadixTooltip.Trigger>
              <RadixTooltip.Portal>
                <RadixTooltip.Content
                  className="max-w-[240px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-lg"
                  sideOffset={4}
                >
                  기간 내 반품 수량 합계
                </RadixTooltip.Content>
              </RadixTooltip.Portal>
            </RadixTooltip.Root>
            <RadixTooltip.Root>
              <RadixTooltip.Trigger asChild>
                <article className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-1.5">
                    <BarChart3 className="h-4 w-4 text-slate-400" />
                    <p className="text-xs font-medium text-slate-500">버킷당 평균</p>
                  </div>
              <p className="mt-1 text-xl font-bold tabular-nums text-slate-800">
                {formatDecimalForDisplay(currOutboundTotal / Math.max(trendSeries.length, 1))}
              </p>
                </article>
              </RadixTooltip.Trigger>
              <RadixTooltip.Portal>
                <RadixTooltip.Content
                  className="max-w-[240px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-lg"
                  sideOffset={4}
                >
                  기간을 기간 수로 나눈 출고량 평균
                </RadixTooltip.Content>
              </RadixTooltip.Portal>
            </RadixTooltip.Root>
            <RadixTooltip.Root>
              <RadixTooltip.Trigger asChild>
                <Link
                  href="/outbound"
                  className="block rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <p className="text-xs font-medium text-slate-500">이상치</p>
                  </div>
                  <p className="mt-1 text-xl font-bold tabular-nums text-amber-600">
                    {anomalies.length}건
                  </p>
                </Link>
              </RadixTooltip.Trigger>
              <RadixTooltip.Portal>
                <RadixTooltip.Content
                  className="max-w-[240px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-lg"
                  sideOffset={4}
                >
                  전기 대비 30% 이상 급증한 품목
                </RadixTooltip.Content>
              </RadixTooltip.Portal>
            </RadixTooltip.Root>
          </div>

          {/* 차트 */}
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <TrendingUp className="h-4 w-4 text-slate-500" />
              출고/리턴 추세
            </h3>
            {trendSeries.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-slate-500">
                데이터가 없습니다.
              </div>
            ) : (
              <TrendChart series={trendSeries} />
            )}
          </section>
        </Tabs.Content>

        {/* 탭 2: 비교 */}
        <Tabs.Content value="compare" className="space-y-4 focus-visible:outline-none">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <BarChart3 className="h-4 w-4 text-slate-500" />
                세그먼트 TOP 5 ({SEGMENT_LABEL[segmentBy]})
              </h3>
              <div className="space-y-1">
                {segmentComparison.length === 0 ? (
                  <p className="text-sm text-slate-500">데이터가 없습니다.</p>
                ) : (
                  segmentComparison.map((segment) => (
                    <Link
                      key={segment.key}
                      href={buildOutboundLink(segment.drilldownQuery.query)}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-slate-50"
                      title={`출고 ${formatDecimalForDisplay(segment.outboundQty)} / 리턴 ${formatDecimalForDisplay(segment.returnQty)}`}
                    >
                      <span className="min-w-0 truncate text-slate-700">{segment.label}</span>
                      <span className="shrink-0 text-slate-500">
                        출고 {formatDecimalForDisplay(segment.outboundQty)} · {formatRate(segment.returnRate)}%
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                이상치 (+30% 이상)
              </h3>
              <div className="space-y-1">
                {anomalies.length === 0 ? (
                  <p className="text-sm text-slate-500">이상치가 없습니다.</p>
                ) : (
                  anomalies.slice(0, 6).map(renderAnomaly)
                )}
              </div>
            </section>
          </div>
        </Tabs.Content>

        {/* 탭 3: 품목 */}
        <Tabs.Content value="items" className="space-y-4 focus-visible:outline-none">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <ArrowUpRight className="h-4 w-4 text-slate-500" />
                출고량 TOP 5
              </h3>
              <div className="space-y-2">
                {topOutbound.length === 0 ? (
                  <p className="text-sm text-slate-500">데이터가 없습니다.</p>
                ) : (
                  topOutbound.map((item) => (
                    <div key={item.itemId} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <Link
                          href={`/stocks?analysisItemId=${item.itemId}&range=${range}`}
                          className="truncate text-slate-700 hover:text-blue-600"
                        >
                          {item.itemCode} {item.itemName}
                        </Link>
                        <span className="tabular-nums text-slate-600">
                          {formatDecimalForDisplay(item.outboundQty)}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${analysisBarWidth(item, maxOutbound)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <ArrowDownRight className="h-4 w-4 text-slate-500" />
                저출고 TOP 5
              </h3>
              <div className="space-y-1">
                {worstOutbound.length === 0 ? (
                  <p className="text-sm text-slate-500">데이터가 없습니다.</p>
                ) : (
                  worstOutbound.map((item) => (
                    <Link
                      key={`worst-${item.itemId}`}
                      href={`/stocks?analysisItemId=${item.itemId}&range=${range}`}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-slate-50"
                    >
                      <span className="truncate text-slate-700">{item.itemCode} {item.itemName}</span>
                      <span className="tabular-nums text-amber-600">
                        {formatDecimalForDisplay(item.outboundQty)}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <BarChart3 className="h-4 w-4 text-slate-500" />
                Pareto (리턴 80%)
              </h3>
              {pareto && pareto.items.length > 0 && (
                <p className="mb-3 text-xs text-slate-500">
                  누적 {formatRate(pareto.coverageRate)}% / 총 {formatDecimalForDisplay(pareto.totalReturnQty)}
                </p>
              )}
              <div className="space-y-1">
                {!pareto || pareto.items.length === 0 ? (
                  <p className="text-sm text-slate-500">데이터가 없습니다.</p>
                ) : (
                  pareto.items.map(renderParetoItem)
                )}
              </div>
            </section>
          </div>

          {/* 리턴 품질 */}
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Target className="h-4 w-4 text-slate-500" />
              리턴 품질
            </h3>
            <p className="mb-3 text-xs text-slate-500">목표 {formatRate(targetLine)}% 대비 이탈 품목</p>
            <div className="space-y-1">
              {topReturnRate.length === 0 ? (
                <p className="text-sm text-slate-500">데이터가 없습니다.</p>
              ) : (
                topReturnRate.map((item) => {
                  const isOverTarget = item.returnRate > targetLine;
                  return (
                    <Link
                      key={item.itemId}
                      href={`/stocks?analysisItemId=${item.itemId}&range=${range}`}
                      className={cn(
                        'flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
                        isOverTarget ? 'hover:bg-amber-50' : 'hover:bg-slate-50',
                      )}
                      title={`출고 ${formatDecimalForDisplay(item.outboundQty)} / 리턴율 ${formatRate(item.returnRate)}%`}
                    >
                      <span
                        className={cn('truncate', isOverTarget ? 'font-medium text-amber-800' : 'text-slate-700')}
                      >
                        {item.itemCode} {item.itemName}
                      </span>
                      <span className={cn('shrink-0', isOverTarget ? 'font-semibold text-amber-600' : 'text-slate-600')}>
                        {formatRate(item.returnRate)}%
                        {isOverTarget && <span className="ml-1 text-xs text-amber-500">초과</span>}
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          </section>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
