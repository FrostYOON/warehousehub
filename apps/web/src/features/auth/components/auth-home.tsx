'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import { canAccessInbound } from '@/features/auth/model/role-policy';
import {
  buildDashboardMenus,
  DashboardShell,
  SummaryGrid,
  useDashboardSummary,
} from '@/features/dashboard';
import type {
  DashboardAnalyticsRange,
  DashboardSegmentBy,
  DashboardSummary,
  DashboardSummaryResponse,
} from '@/features/dashboard/model/types';
import { AlertsWidget } from '@/features/dashboard/components/home/alerts-widget';
import { AnalysisWidget } from '@/features/dashboard/components/home/analysis-widget';
import { DataReliabilityBadge } from '@/features/dashboard/components/home/data-reliability-badge';
import { TodosWidget } from '@/features/dashboard/components/home/todos-widget';
import { WidgetFrame } from '@/features/dashboard/components/home/widget-frame';
import {
  type DashboardWidgetId,
  useDashboardHomeLayout,
} from '@/features/dashboard/hooks/use-dashboard-home-layout';

const RANGE_VALUES: DashboardAnalyticsRange[] = ['WEEK', 'QUARTER', 'HALF', 'YEAR'];
const SEGMENT_VALUES: DashboardSegmentBy[] = ['WAREHOUSE_TYPE', 'CUSTOMER'];

function parseRange(value: string | null): DashboardAnalyticsRange | undefined {
  if (!value) return undefined;
  return RANGE_VALUES.includes(value as DashboardAnalyticsRange)
    ? (value as DashboardAnalyticsRange)
    : undefined;
}

function parseSegment(value: string | null): DashboardSegmentBy | undefined {
  if (!value) return undefined;
  return SEGMENT_VALUES.includes(value as DashboardSegmentBy)
    ? (value as DashboardSegmentBy)
    : undefined;
}

function toCsv(rows: string[][]) {
  return rows
    .map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(','))
    .join('\n');
}

function buildAnalysisCsvRows(
  summary: DashboardSummaryResponse,
  range: DashboardAnalyticsRange,
  segmentBy: DashboardSegmentBy,
) {
  const rangeLabel: Record<DashboardAnalyticsRange, string> = {
    WEEK: '주간',
    QUARTER: '분기',
    HALF: '반기',
    YEAR: '연간',
  };
  const segmentByLabel: Record<DashboardSegmentBy, string> = {
    WAREHOUSE_TYPE: '창고타입',
    CUSTOMER: '고객사',
  };
  return [
    ['리포트', '출고 분석 대시보드'],
    ['기준시각', new Date(summary.asOf).toLocaleString()],
    ['집계기간', rangeLabel[range]],
    ['세그먼트', segmentByLabel[segmentBy]],
    [],
    ['구분', '라벨', '기간시작', '기간종료', '출고량', '리턴량', '리턴율', '비고'],
    ...summary.analysis.trendSeries.map((point) => [
      '추세',
      point.label,
      point.start.slice(0, 10),
      point.end.slice(0, 10),
      point.outboundQty.toFixed(3),
      point.returnQty.toFixed(3),
      `${point.returnRate.toFixed(2)}%`,
      '',
    ]),
    ...summary.analysis.segmentComparison.map((segment) => [
      '세그먼트',
      segment.label,
      '',
      '',
      segment.outboundQty.toFixed(3),
      segment.returnQty.toFixed(3),
      `${segment.returnRate.toFixed(2)}%`,
      '',
    ]),
    ...summary.analysis.anomalies.map((item) => [
      '이상치',
      `${item.itemCode} ${item.itemName}`,
      '',
      '',
      item.currentOutboundQty.toFixed(3),
      item.previousOutboundQty.toFixed(3),
      `${item.growthRate.toFixed(2)}%`,
      '전기대비 급증',
    ]),
    ...summary.analysis.pareto.items.map((item) => [
      '파레토',
      `${item.itemCode} ${item.itemName}`,
      '',
      '',
      '',
      item.returnQty.toFixed(3),
      `${item.cumulativeShare.toFixed(2)}%`,
      '누적 기여율',
    ]),
  ];
}

export function AuthHome() {
  const { me, loggingOut, signOut } = useAuthSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialRange = useMemo(() => parseRange(searchParams.get('range')), [searchParams]);
  const initialSegmentBy = useMemo(
    () => parseSegment(searchParams.get('segmentBy')),
    [searchParams],
  );
  const {
    data: summary,
    loading,
    range,
    setRange,
    segmentBy,
    setSegmentBy,
    refresh,
    autoRefreshMs,
  } = useDashboardSummary({ initialRange, initialSegmentBy });
  const role = me?.role;

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;
    if (params.get('range') !== range) {
      params.set('range', range);
      changed = true;
    }
    if (params.get('segmentBy') !== segmentBy) {
      params.set('segmentBy', segmentBy);
      changed = true;
    }
    if (!changed) return;
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [pathname, range, router, searchParams, segmentBy]);

  const summaryItems: DashboardSummary[] = [
    {
      title: '재고 품목',
      value: String(summary?.kpis.totalItems ?? '-'),
      hint: '활성 상품 마스터 건수',
      href: '/stocks',
    },
    {
      title: '출고 진행',
      value: String(summary?.kpis.outboundInProgress ?? '-'),
      hint: '피킹/배송 진행 건수',
      href: '/outbound?statuses=PICKING,PICKED,READY_TO_SHIP,SHIPPING',
    },
    {
      title: '반품 처리',
      value: String(summary?.kpis.returnsToday ?? '-'),
      hint: '오늘 반품 접수/처리 건수',
      href: '/returns?statuses=RECEIVED,DECIDED',
    },
  ];

  if (canAccessInbound(me?.role)) {
    summaryItems.splice(1, 0, {
      title: '입고 대기',
      value: String(summary?.kpis.inboundPending ?? '-'),
      hint: '확정 전 업로드 건수',
      href: '/inbound?status=UPLOADED',
    });
  }

  const menus = buildDashboardMenus(me?.role);
  const todos = (summary?.todos ?? []).filter((todo) => todo.value > 0);
  const alerts = (summary?.alerts ?? []).filter((alert) => alert.value > 0);
  const canSeeAlertsWidget = role === 'ADMIN' || role === 'WH_MANAGER' || role === 'DELIVERY';
  const canSeeAnalysisWidget =
    role === 'ADMIN' ||
    role === 'WH_MANAGER' ||
    role === 'DELIVERY' ||
    role === 'SALES' ||
    role === 'ACCOUNTING';

  const downloadAnalysisCsv = () => {
    if (!summary?.analysis) return;
    const rows = buildAnalysisCsvRows(summary, range, segmentBy);

    const blob = new Blob([`\uFEFF${toCsv(rows)}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `outbound-analysis-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const visibleWidgets = useMemo(() => {
    const list: DashboardWidgetId[] = [];
    if (canSeeAlertsWidget && alerts.length > 0) list.push('alerts');
    if (todos.length > 0) list.push('todos');
    if (canSeeAnalysisWidget) list.push('analysis');
    return list;
  }, [alerts.length, canSeeAlertsWidget, canSeeAnalysisWidget, todos.length]);

  const { orderedVisibleWidgets, collapsed, toggleCollapsed, moveWidget } =
    useDashboardHomeLayout(visibleWidgets);

  return (
    <DashboardShell
      userName={me?.name ?? '사용자'}
      companyName={me?.companyName ?? '회사'}
      onLogout={signOut}
      loggingOut={loggingOut}
      menus={menus}
    >
      <SummaryGrid items={summaryItems} />
      <section className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs text-slate-500">데이터 동기화 상태</p>
            <p className="mt-0.5 text-sm text-slate-700">
              기준 시각: {summary?.asOf ? new Date(summary.asOf).toLocaleString() : '-'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">
              자동 {Math.round(autoRefreshMs / 1000)}초
            </span>
            <button
              type="button"
              onClick={() => void refresh(true)}
              disabled={loading}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? '갱신 중...' : '수동 새로고침'}
            </button>
          </div>
        </div>
      </section>
      {orderedVisibleWidgets.map((id, idx) => {
        const frameProps = {
          collapsed: collapsed[id],
          onToggle: () => toggleCollapsed(id),
          onMoveUp: () => moveWidget(id, -1),
          onMoveDown: () => moveWidget(id, 1),
          canMoveUp: idx > 0,
          canMoveDown: idx < orderedVisibleWidgets.length - 1,
          meta: (
            <DataReliabilityBadge asOf={summary?.asOf} source="집계" autoRefreshMs={autoRefreshMs} />
          ),
        };

        if (id === 'alerts') {
          return (
            <WidgetFrame key={id} title="주의가 필요한 항목" {...frameProps}>
              <AlertsWidget alerts={alerts} />
            </WidgetFrame>
          );
        }
        if (id === 'todos') {
          return (
            <WidgetFrame key={id} title="내 할 일" {...frameProps}>
              <TodosWidget todos={todos} />
            </WidgetFrame>
          );
        }
        if (id === 'analysis') {
          return (
            <WidgetFrame key={id} title="아이템 분석 요약" {...frameProps}>
              <AnalysisWidget
                summary={summary}
                range={range}
                setRange={setRange}
                segmentBy={segmentBy}
                setSegmentBy={setSegmentBy}
                onDownloadCsv={downloadAnalysisCsv}
              />
            </WidgetFrame>
          );
        }
        return null;
      })}
    </DashboardShell>
  );
}
