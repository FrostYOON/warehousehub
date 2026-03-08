'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getDashboardPrefs,
  updateDashboardPrefs,
  type DashboardPrefs,
} from '@/features/dashboard/api/dashboard.api';
import { dashboardKeys } from '@/features/dashboard/lib/query-keys';

export type DashboardWidgetId = 'alerts' | 'todos' | 'analysis' | 'inventory';

const DEFAULT_ORDER: DashboardWidgetId[] = ['alerts', 'todos', 'analysis', 'inventory'];
const DEFAULT_COLLAPSED: Record<DashboardWidgetId, boolean> = {
  alerts: false,
  todos: false,
  analysis: false,
  inventory: false,
};

function isValidWidgetId(id: string): id is DashboardWidgetId {
  return ['alerts', 'todos', 'analysis', 'inventory'].includes(id);
}

export function useDashboardHomeLayout(availableWidgets: DashboardWidgetId[]) {
  const queryClient = useQueryClient();
  const { data: prefs, isLoading } = useQuery({
    queryKey: dashboardKeys.prefs,
    queryFn: getDashboardPrefs,
    staleTime: 60_000,
  });

  const [localOrder, setLocalOrder] = useState<DashboardWidgetId[]>([]);
  const [localVisibility, setLocalVisibility] = useState<Record<string, boolean>>({});
  const [localCollapsed, setLocalCollapsed] = useState<Record<DashboardWidgetId, boolean>>(
    DEFAULT_COLLAPSED,
  );

  useEffect(() => {
    if (prefs) {
      const order = (prefs.widgetOrder ?? [])
        .filter(isValidWidgetId)
        .filter((id) => availableWidgets.includes(id));
      if (order.length > 0) setLocalOrder(order);
      if (Object.keys(prefs.widgetVisibility ?? {}).length > 0) {
        setLocalVisibility(prefs.widgetVisibility ?? {});
      }
      if (Object.keys(prefs.widgetCollapsed ?? {}).length > 0) {
        setLocalCollapsed((prev) => ({
          ...DEFAULT_COLLAPSED,
          ...prev,
          ...(prefs.widgetCollapsed ?? {}),
        }));
      }
    }
  }, [prefs, availableWidgets]);

  const saveToServer = useCallback(
    (updates: Partial<DashboardPrefs>) => {
      updateDashboardPrefs(updates).then((saved) => {
        queryClient.setQueryData(dashboardKeys.prefs, saved);
      });
    },
    [queryClient],
  );

  const order = localOrder.length > 0 ? localOrder : [...availableWidgets];
  const visibleAfterPrefs = useMemo(() => {
    return availableWidgets.filter((id) => localVisibility[id] !== false);
  }, [availableWidgets, localVisibility]);

  const orderedVisibleWidgets = useMemo(() => {
    const inView = new Set(visibleAfterPrefs);
    const seeded = order.filter((id) => inView.has(id));
    const rest = visibleAfterPrefs.filter((id) => !seeded.includes(id));
    return [...seeded, ...rest];
  }, [order, visibleAfterPrefs]);

  const toggleCollapsed = useCallback(
    (id: DashboardWidgetId) => {
      setLocalCollapsed((prev) => {
        const next = { ...prev, [id]: !prev[id] };
        saveToServer({ widgetCollapsed: next });
        return next;
      });
    },
    [saveToServer],
  );

  const moveWidget = useCallback(
    (id: DashboardWidgetId, direction: -1 | 1) => {
      setLocalOrder((prev) => {
        const base = prev.length > 0 ? [...prev] : [...availableWidgets];
        const currentIndex = base.indexOf(id);
        if (currentIndex < 0) return base;
        const target = currentIndex + direction;
        if (target < 0 || target >= base.length) return base;
        const next = [...base];
        const [picked] = next.splice(currentIndex, 1);
        next.splice(target, 0, picked);
        saveToServer({ widgetOrder: next });
        return next;
      });
    },
    [availableWidgets, saveToServer],
  );

  const toggleWidgetVisibility = useCallback(
    (id: DashboardWidgetId) => {
      setLocalVisibility((prev) => {
        const next = { ...prev, [id]: !(prev[id] !== false) };
        saveToServer({ widgetVisibility: next });
        return next;
      });
    },
    [saveToServer],
  );

  const collapsed = useMemo(
    () => ({
      ...DEFAULT_COLLAPSED,
      ...localCollapsed,
    }),
    [localCollapsed],
  );

  return {
    orderedVisibleWidgets,
    collapsed,
    toggleCollapsed,
    moveWidget,
    toggleWidgetVisibility,
    isLoading,
    hiddenWidgets: availableWidgets.filter((id) => localVisibility[id] === false),
    availableWidgets,
  };
}
