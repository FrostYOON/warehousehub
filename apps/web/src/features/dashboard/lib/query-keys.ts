import type { DashboardAnalyticsRange, DashboardSegmentBy } from '../model/types';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  prefs: ['dashboard', 'prefs'] as const,
  summary: (range: DashboardAnalyticsRange, segmentBy: DashboardSegmentBy) =>
    ['dashboard', 'summary', range, segmentBy] as const,
};
