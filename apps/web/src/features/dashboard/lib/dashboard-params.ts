import { parseAsStringLiteral } from 'nuqs';
import type { DashboardAnalyticsRange, DashboardSegmentBy } from '../model/types';

const RANGE_VALUES = ['WEEK', 'QUARTER', 'HALF', 'YEAR'] as const;
const SEGMENT_VALUES = ['WAREHOUSE_TYPE', 'CUSTOMER'] as const;
const TAB_VALUES = ['trend', 'compare', 'items'] as const;

export type AnalysisTab = (typeof TAB_VALUES)[number];

export const dashboardParamParsers = {
  range: parseAsStringLiteral(RANGE_VALUES).withDefault('QUARTER' as DashboardAnalyticsRange),
  segmentBy: parseAsStringLiteral(SEGMENT_VALUES).withDefault(
    'WAREHOUSE_TYPE' as DashboardSegmentBy,
  ),
  tab: parseAsStringLiteral(TAB_VALUES).withDefault('trend' as AnalysisTab),
} as const;
