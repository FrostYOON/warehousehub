export type DashboardSummary = {
  title: string;
  value: string;
  hint: string;
  href?: string;
};

export type DashboardAlert = {
  id: string;
  level: 'critical' | 'warning' | 'info';
  label: string;
  value: number;
  href: string;
};

export type DashboardTodo = {
  id: string;
  label: string;
  value: number;
  href: string;
};

export type DashboardSummaryResponse = {
  asOf: string;
  analysis: {
    range: DashboardAnalyticsRange;
    segmentBy: DashboardSegmentBy;
    targetLine: number;
    trendSeries: DashboardTrendPoint[];
    segmentComparison: DashboardSegmentPoint[];
    anomalies: DashboardAnomaly[];
    pareto: DashboardPareto;
    topOutboundItems: DashboardItemAnalysis[];
    worstOutboundItems: DashboardItemAnalysis[];
    topReturnRateItems: DashboardItemAnalysis[];
  };
  kpis: {
    totalItems: number;
    inboundPending: number;
    outboundInProgress: number;
    returnsToday: number;
    approvalPending: number;
  };
  alerts: DashboardAlert[];
  todos: DashboardTodo[];
};

export type DashboardAnalyticsRange = 'WEEK' | 'QUARTER' | 'HALF' | 'YEAR';
export type DashboardSegmentBy = 'WAREHOUSE_TYPE' | 'CUSTOMER';

export type DashboardItemAnalysis = {
  itemId: string;
  itemCode: string;
  itemName: string;
  outboundQty: number;
  returnQty: number;
  returnRate: number;
};

export type DashboardTrendPoint = {
  label: string;
  start: string;
  end: string;
  outboundQty: number;
  returnQty: number;
  returnRate: number;
  isOverTarget: boolean;
  drilldownQuery: {
    path: '/outbound';
    query: Record<string, string>;
  };
};

export type DashboardSegmentPoint = {
  key: string;
  label: string;
  outboundQty: number;
  returnQty: number;
  returnRate: number;
  drilldownQuery: {
    path: '/outbound';
    query: Record<string, string>;
  };
};

export type DashboardAnomaly = {
  itemId: string;
  itemCode: string;
  itemName: string;
  currentOutboundQty: number;
  previousOutboundQty: number;
  growthRate: number;
  drilldownQuery: {
    path: '/outbound';
    query: Record<string, string>;
  };
};

export type DashboardPareto = {
  totalReturnQty: number;
  coverageRate: number;
  items: Array<{
    itemId: string;
    itemCode: string;
    itemName: string;
    returnQty: number;
    cumulativeShare: number;
    drilldownQuery: {
      path: '/outbound';
      query: Record<string, string>;
    };
  }>;
};

export type DashboardMenu = {
  label: string;
  description: string;
  href: string;
  disabled?: boolean;
  disabledReason?: string;
};
