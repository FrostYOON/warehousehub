'use client';

import { useEffect, useMemo, useState } from 'react';

export type DashboardWidgetId = 'alerts' | 'todos' | 'analysis' | 'inventory';

const ORDER_KEY = 'dashboard.home.widgetOrder.v1';
const COLLAPSE_KEY = 'dashboard.home.widgetCollapse.v1';

function readOrder(): DashboardWidgetId[] {
  try {
    const raw = window.localStorage.getItem(ORDER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return parsed.filter(
      (value): value is DashboardWidgetId =>
        value === 'alerts' ||
        value === 'todos' ||
        value === 'analysis' ||
        value === 'inventory',
    );
  } catch {
    return [];
  }
}

function readCollapsed(): Record<DashboardWidgetId, boolean> {
  try {
    const raw = window.localStorage.getItem(COLLAPSE_KEY);
    if (!raw) {
      return { alerts: false, todos: false, analysis: false, inventory: false };
    }
    const parsed = JSON.parse(raw) as Partial<Record<DashboardWidgetId, boolean>>;
    return {
      alerts: Boolean(parsed.alerts),
      todos: Boolean(parsed.todos),
      analysis: Boolean(parsed.analysis),
      inventory: Boolean(parsed.inventory),
    };
  } catch {
    return { alerts: false, todos: false, analysis: false, inventory: false };
  }
}

export function useDashboardHomeLayout(visibleWidgets: DashboardWidgetId[]) {
  const [order, setOrder] = useState<DashboardWidgetId[]>(() => {
    if (typeof window === 'undefined') return [];
    return readOrder();
  });
  const [collapsed, setCollapsed] = useState<Record<DashboardWidgetId, boolean>>(() => {
    if (typeof window === 'undefined') {
      return { alerts: false, todos: false, analysis: false, inventory: false };
    }
    return readCollapsed();
  });

  useEffect(() => {
    window.localStorage.setItem(ORDER_KEY, JSON.stringify(order));
  }, [order]);

  useEffect(() => {
    window.localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsed));
  }, [collapsed]);

  const orderedVisibleWidgets = useMemo(() => {
    const inView = new Set(visibleWidgets);
    const seeded = order.filter((id) => inView.has(id));
    const rest = visibleWidgets.filter((id) => !seeded.includes(id));
    return [...seeded, ...rest];
  }, [order, visibleWidgets]);

  function toggleCollapsed(id: DashboardWidgetId) {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function moveWidget(id: DashboardWidgetId, direction: -1 | 1) {
    setOrder((prev) => {
      const base =
        prev.length > 0 ? [...prev] : [...visibleWidgets];
      const currentIndex = base.indexOf(id);
      if (currentIndex < 0) return base;
      const target = currentIndex + direction;
      if (target < 0 || target >= base.length) return base;
      const next = [...base];
      const [picked] = next.splice(currentIndex, 1);
      next.splice(target, 0, picked);
      return next;
    });
  }

  return {
    orderedVisibleWidgets,
    collapsed,
    toggleCollapsed,
    moveWidget,
  };
}
