import Link from 'next/link';
import { useMemo } from 'react';
import type {
  DashboardAnalyticsRange,
  DashboardAnomaly,
  DashboardItemAnalysis,
  DashboardPareto,
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

function trendBarHeight(value: number, max: number) {
  if (max <= 0) return 4;
  return Math.max(4, Math.round((value / max) * 100));
}

function analysisBarWidth(item: DashboardItemAnalysis, maxValue: number) {
  if (maxValue <= 0) return 0;
  return Math.max(4, Math.round((item.outboundQty / maxValue) * 100));
}

type AnalysisWidgetProps = {
  summary: DashboardSummaryResponse | null;
  range: DashboardAnalyticsRange;
  setRange: (value: DashboardAnalyticsRange) => void;
  segmentBy: DashboardSegmentBy;
  setSegmentBy: (value: DashboardSegmentBy) => void;
  onDownloadCsv: () => void;
};

export function AnalysisWidget({
  summary,
  range,
  setRange,
  segmentBy,
  setSegmentBy,
  onDownloadCsv,
}: AnalysisWidgetProps) {
  const trendSeries = useMemo(() => summary?.analysis?.trendSeries ?? [], [summary?.analysis?.trendSeries]);
  const segmentComparison = summary?.analysis?.segmentComparison ?? [];
  const anomalies = summary?.analysis?.anomalies ?? [];
  const pareto = summary?.analysis?.pareto;
  const topOutbound = useMemo(() => summary?.analysis?.topOutboundItems ?? [], [summary?.analysis?.topOutboundItems]);
  const worstOutbound = summary?.analysis?.worstOutboundItems ?? [];

  const maxTrendOutbound = useMemo(
    () => trendSeries.reduce((max, point) => Math.max(max, point.outboundQty), 0),
    [trendSeries],
  );
  const maxTrendReturn = useMemo(
    () => trendSeries.reduce((max, point) => Math.max(max, point.returnQty), 0),
    [trendSeries],
  );
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

  const renderTrendRow = (point: DashboardTrendPoint) => (
    <Link
      key={point.label}
      href={buildOutboundLink(point.drilldownQuery.query)}
      className="rounded-md border border-slate-200 bg-slate-50 px-2 py-2 hover:bg-slate-100"
      title={`출고 ${point.outboundQty.toFixed(3)} / 리턴 ${point.returnQty.toFixed(3)} / 리턴율 ${point.returnRate.toFixed(2)}%`}
    >
      <p className="truncate text-[10px] text-slate-600">{point.label}</p>
      <div className="mt-2 flex h-24 items-end justify-center gap-1">
        <div
          className="w-2 rounded-sm bg-blue-500"
          style={{ height: `${trendBarHeight(point.outboundQty, maxTrendOutbound)}px` }}
          title={`출고 ${point.outboundQty.toFixed(3)}`}
        />
        <div
          className="w-2 rounded-sm bg-emerald-500"
          style={{ height: `${trendBarHeight(point.returnQty, maxTrendReturn)}px` }}
          title={`리턴 ${point.returnQty.toFixed(3)}`}
        />
      </div>
      <p className="mt-1 text-center text-[10px] text-slate-600">{point.returnRate.toFixed(2)}%</p>
    </Link>
  );

  const renderAnomaly = (item: DashboardAnomaly) => (
    <Link
      key={item.itemId}
      href={buildOutboundLink(item.drilldownQuery.query)}
      className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs hover:bg-red-100"
      title={`현재 ${item.currentOutboundQty.toFixed(3)} / 이전 ${item.previousOutboundQty.toFixed(3)} / 증가율 ${item.growthRate.toFixed(2)}%`}
    >
      <p className="truncate text-red-800">
        {item.itemCode} {item.itemName}
      </p>
      <p className="font-medium text-red-800">+{item.growthRate.toFixed(1)}%</p>
    </Link>
  );

  const renderParetoItem = (item: DashboardPareto['items'][number]) => (
    <Link
      key={`pareto-${item.itemId}`}
      href={buildOutboundLink(item.drilldownQuery.query)}
      className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1 text-xs hover:bg-slate-100"
      title={`리턴 ${item.returnQty.toFixed(3)} / 누적 기여 ${item.cumulativeShare.toFixed(2)}%`}
    >
      <p className="truncate text-slate-700">
        {item.itemCode} {item.itemName}
      </p>
      <p className="text-slate-700">{item.cumulativeShare.toFixed(1)}%</p>
    </Link>
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          {RANGE_LABEL[range]} 기준으로 출고 중심 추세/이상치를 우선 확인하고, 리턴은 품질 참고 지표로 확인합니다.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as DashboardAnalyticsRange)}
            className="h-8 rounded-md border border-slate-300 px-2 text-xs"
          >
            <option value="WEEK">주간</option>
            <option value="QUARTER">분기</option>
            <option value="HALF">반기</option>
            <option value="YEAR">연간</option>
          </select>
          <select
            value={segmentBy}
            onChange={(e) => setSegmentBy(e.target.value as DashboardSegmentBy)}
            className="h-8 rounded-md border border-slate-300 px-2 text-xs"
          >
            <option value="WAREHOUSE_TYPE">창고타입</option>
            <option value="CUSTOMER">고객사</option>
          </select>
          <Link
            href="/stocks"
            className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
          >
            재고 분석 상세
          </Link>
          <button
            type="button"
            onClick={onDownloadCsv}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
            title="현재 분석 데이터를 CSV로 다운로드"
          >
            CSV 다운로드
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-500">총 출고량</p>
          <p className="mt-1 text-xl font-semibold text-slate-800">
            {trendSeries.reduce((sum, point) => sum + point.outboundQty, 0).toFixed(3)}
          </p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-500">버킷당 평균 출고량</p>
          <p className="mt-1 text-xl font-semibold text-slate-800">
            {(
              trendSeries.reduce((sum, point) => sum + point.outboundQty, 0) /
              Math.max(trendSeries.length, 1)
            ).toFixed(3)}
          </p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-500">이상치 건수</p>
          <p className="mt-1 text-xl font-semibold text-amber-700">{anomalies.length}</p>
        </article>
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 p-3">
        <h3 className="text-xs font-semibold text-slate-700">출고 중심 추세 그래프 (출고/리턴 + 리턴율 참고)</h3>
        <div className="mt-2 grid grid-cols-7 gap-2 md:grid-cols-13">
          {trendSeries.length === 0 ? (
            <p className="col-span-full text-xs text-slate-500">데이터가 없습니다.</p>
          ) : (
            trendSeries.map(renderTrendRow)
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
        <article className="rounded-lg border border-slate-200 p-3">
          <h3 className="text-xs font-semibold text-slate-700">
            세그먼트 비교 TOP 5 ({SEGMENT_LABEL[segmentBy]})
          </h3>
          <div className="mt-2 space-y-2">
            {segmentComparison.length === 0 ? (
              <p className="text-xs text-slate-500">데이터가 없습니다.</p>
            ) : (
              segmentComparison.map((segment) => (
                <Link
                  key={segment.key}
                  href={buildOutboundLink(segment.drilldownQuery.query)}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs hover:bg-slate-100"
                  title={`출고 ${segment.outboundQty.toFixed(3)} / 리턴 ${segment.returnQty.toFixed(3)} / 리턴율 ${segment.returnRate.toFixed(2)}%`}
                >
                  <p className="truncate text-slate-700">{segment.label}</p>
                  <p className="text-slate-700">출고 {segment.outboundQty.toFixed(1)}</p>
                  <p className="text-slate-700">리턴율 {segment.returnRate.toFixed(2)}%</p>
                </Link>
              ))
            )}
          </div>
        </article>
        <article className="rounded-lg border border-slate-200 p-3">
          <h3 className="text-xs font-semibold text-slate-700">이상치 탐지 (전기 대비 +30% 이상)</h3>
          <div className="mt-2 space-y-2">
            {anomalies.length === 0 ? (
              <p className="text-xs text-slate-500">이상치가 없습니다.</p>
            ) : (
              anomalies.slice(0, 6).map(renderAnomaly)
            )}
          </div>
        </article>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <article className="rounded-lg border border-slate-200 p-3">
          <h3 className="text-xs font-semibold text-slate-700">출고량 TOP 5 (Best)</h3>
          <div className="mt-2 space-y-2">
            {topOutbound.length === 0 ? (
              <p className="text-xs text-slate-500">데이터가 없습니다.</p>
            ) : (
              topOutbound.map((item) => (
                <div key={item.itemId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <Link href={`/stocks?analysisItemId=${item.itemId}&range=${range}`} className="truncate text-slate-700 hover:underline">
                      {item.itemCode} {item.itemName}
                    </Link>
                    <p className="text-slate-600">{item.outboundQty.toFixed(3)}</p>
                  </div>
                  <div className="h-2 rounded bg-slate-100">
                    <div
                      className="h-2 rounded bg-blue-500"
                      style={{ width: `${analysisBarWidth(item, maxOutbound)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
        <article className="rounded-lg border border-slate-200 p-3">
          <h3 className="text-xs font-semibold text-slate-700">저출고 품목 TOP 5 (Worst)</h3>
          <div className="mt-2 space-y-2">
            {worstOutbound.length === 0 ? (
              <p className="text-xs text-slate-500">데이터가 없습니다.</p>
            ) : (
              worstOutbound.map((item) => (
                <div key={`worst-${item.itemId}`} className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1 text-xs">
                  <Link href={`/stocks?analysisItemId=${item.itemId}&range=${range}`} className="truncate text-slate-700 hover:underline">
                    {item.itemCode} {item.itemName}
                  </Link>
                  <span className="text-amber-700">{item.outboundQty.toFixed(3)}</span>
                </div>
              ))
            )}
          </div>
        </article>
        <article className="rounded-lg border border-slate-200 p-3">
          <h3 className="text-xs font-semibold text-slate-700">Pareto (리턴 누적 80%)</h3>
          <div className="mt-2 space-y-2">
            {!pareto || pareto.items.length === 0 ? (
              <p className="text-xs text-slate-500">데이터가 없습니다.</p>
            ) : (
              <>
                <p className="text-[11px] text-slate-600">
                  누적 기여 {pareto.coverageRate.toFixed(1)}% / 총 리턴 {pareto.totalReturnQty.toFixed(3)}
                </p>
                {pareto.items.map(renderParetoItem)}
              </>
            )}
          </div>
        </article>
      </div>
    </>
  );
}
