import { Injectable } from '@nestjs/common';
import {
  InboundUploadStatus,
  OutboundStatus,
  StorageType,
  ReturnStatus,
  Role,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DashboardAnalyticsRange,
  DashboardSegmentBy,
} from './dto/dashboard-summary-query.dto';

export const DASHBOARD_OUTBOUND_IN_PROGRESS_STATUSES: OutboundStatus[] = [
  OutboundStatus.PICKING,
  OutboundStatus.PICKED,
  OutboundStatus.READY_TO_SHIP,
  OutboundStatus.SHIPPING,
];

export const DASHBOARD_OUTBOUND_OVERDUE_STATUSES: OutboundStatus[] = [
  OutboundStatus.DRAFT,
  OutboundStatus.PICKING,
  OutboundStatus.PICKED,
  OutboundStatus.READY_TO_SHIP,
  OutboundStatus.SHIPPING,
];

export const DASHBOARD_RETURNS_TODAY_STATUSES: ReturnStatus[] = [
  ReturnStatus.RECEIVED,
  ReturnStatus.DECIDED,
  ReturnStatus.COMPLETED,
];

const ALERT_LEVEL_PRIORITY = {
  critical: 3,
  warning: 2,
  info: 1,
} as const;

const DASHBOARD_ALERT_TOP_N = 5;
const DASHBOARD_SEGMENT_TOP_N = 5;
const DASHBOARD_ALERT_MIN_VALUE = {
  inboundInvalidPending: 1,
  overdueOutbound: 1,
  returnsDecidedPending: 2,
} as const;

export type DashboardSummaryResponse = {
  asOf: string;
  analysis: {
    range: DashboardAnalyticsRange;
    segmentBy: DashboardSegmentBy;
    targetLine: number;
    trendSeries: Array<{
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
    }>;
    segmentComparison: Array<{
      key: string;
      label: string;
      outboundQty: number;
      returnQty: number;
      returnRate: number;
      drilldownQuery: {
        path: '/outbound';
        query: Record<string, string>;
      };
    }>;
    anomalies: Array<{
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
    }>;
    pareto: {
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
    topOutboundItems: Array<{
      itemId: string;
      itemCode: string;
      itemName: string;
      outboundQty: number;
      returnQty: number;
      returnRate: number;
    }>;
    worstOutboundItems: Array<{
      itemId: string;
      itemCode: string;
      itemName: string;
      outboundQty: number;
      returnQty: number;
      returnRate: number;
    }>;
    topReturnRateItems: Array<{
      itemId: string;
      itemCode: string;
      itemName: string;
      outboundQty: number;
      returnQty: number;
      returnRate: number;
    }>;
    prevOutboundTotal: number;
    prevReturnTotal: number;
  };
  kpis: {
    totalItems: number;
    inboundPending: number;
    outboundInProgress: number;
    returnsToday: number;
    approvalPending: number;
    outboundCompletedToday: number;
    stockShortageCount: number;
  };
  inventoryInsights: {
    expirySoonCount: number; // 30일 이내 (하위 호환)
    expiryByDays: {
      within7: number;
      within14: number;
      within30: number;
      within60: number;
      within90: number;
    };
    shortageCount: number;
  };
  alerts: Array<{
    id: string;
    level: 'critical' | 'warning' | 'info';
    label: string;
    value: number;
    href: string;
  }>;
  todos: Array<{
    id: string;
    label: string;
    value: number;
    href: string;
  }>;
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(
    companyId: string,
    role: Role,
    range: DashboardAnalyticsRange,
    segmentBy: DashboardSegmentBy,
    targetReturnRate: number,
  ): Promise<DashboardSummaryResponse> {
    const normalizedTarget = Number.isFinite(targetReturnRate)
      ? targetReturnRate
      : 2;
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const trendBuckets = buildTrendBuckets(now, range);
    const analysisStart = trendBuckets[0]?.start ?? startOfRange(now, range);
    const previousStart = startOfPreviousWindow(analysisStart, range);

    const addDays = (d: Date, n: number) => {
      const r = new Date(d);
      r.setDate(r.getDate() + n);
      return r;
    };
    const d7 = addDays(startOfToday, 7);
    const d14 = addDays(startOfToday, 14);
    const d30 = addDays(startOfToday, 30);
    const d60 = addDays(startOfToday, 60);
    const d90 = addDays(startOfToday, 90);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const [
      totalItems,
      inboundPending,
      outboundInProgress,
      returnsToday,
      approvalPending,
      outboundCompletedToday,
      temperatureRecordedToday,
      stockShortageGroups,
      expiryWithin7,
      expiryWithin14,
      expiryWithin30,
      expiryWithin60,
      expiryWithin90,
      inboundInvalidPending,
      overdueOutbound,
      returnsDecidedPending,
      outboundLines,
      returnLines,
      previousOutboundLines,
      previousReturnLines,
      customerSegmentOutboundLines,
      customerSegmentReturnLines,
      warehouseSegmentOutboundAllocations,
      warehouseSegmentReturnLines,
    ] = await Promise.all([
      this.prisma.item.count({
        where: { companyId, isActive: true },
      }),
      this.prisma.inboundUpload.count({
        where: { companyId, status: InboundUploadStatus.UPLOADED },
      }),
      this.prisma.outboundOrder.count({
        where: {
          companyId,
          status: {
            in: DASHBOARD_OUTBOUND_IN_PROGRESS_STATUSES,
          },
        },
      }),
      this.prisma.returnReceipt.count({
        where: {
          companyId,
          createdAt: { gte: startOfToday },
          status: { in: DASHBOARD_RETURNS_TODAY_STATUSES },
        },
      }),
      this.prisma.user.count({
        where: { companyId, isActive: false },
      }),
      this.prisma.outboundOrder.count({
        where: {
          companyId,
          status: OutboundStatus.DELIVERED,
          deliveredAt: { gte: startOfToday, lt: endOfToday },
        },
      }),
      this.prisma.temperatureLog.count({
        where: {
          companyId,
          createdAt: { gte: startOfToday, lt: endOfToday },
        },
      }),
      this.prisma.stock.groupBy({
        by: ['lotId'],
        where: { companyId },
        _sum: { onHand: true },
      }),
      this.prisma.lot.count({
        where: {
          companyId,
          expiryDate: {
            not: null,
            gte: startOfToday,
            lt: d7,
          },
        },
      }),
      this.prisma.lot.count({
        where: {
          companyId,
          expiryDate: {
            not: null,
            gte: d7,
            lt: d14,
          },
        },
      }),
      this.prisma.lot.count({
        where: {
          companyId,
          expiryDate: {
            not: null,
            gte: d14,
            lt: d30,
          },
        },
      }),
      this.prisma.lot.count({
        where: {
          companyId,
          expiryDate: {
            not: null,
            gte: d30,
            lt: d60,
          },
        },
      }),
      this.prisma.lot.count({
        where: {
          companyId,
          expiryDate: {
            not: null,
            gte: d60,
            lt: d90,
          },
        },
      }),
      this.prisma.inboundUpload.count({
        where: {
          companyId,
          status: InboundUploadStatus.UPLOADED,
          rows: { some: { isValid: false } },
        },
      }),
      this.prisma.outboundOrder.count({
        where: {
          companyId,
          plannedDate: { lt: startOfToday },
          status: {
            in: DASHBOARD_OUTBOUND_OVERDUE_STATUSES,
          },
        },
      }),
      this.prisma.returnReceipt.count({
        where: {
          companyId,
          status: ReturnStatus.DECIDED,
          lines: { some: { processedAt: null } },
        },
      }),
      this.prisma.outboundLine.findMany({
        where: {
          order: {
            companyId,
            deliveredAt: { gte: analysisStart },
          },
        },
        select: {
          itemId: true,
          deliveredQty: true,
          order: {
            select: {
              deliveredAt: true,
            },
          },
          item: {
            select: {
              itemCode: true,
              itemName: true,
            },
          },
        },
      }),
      this.prisma.returnReceiptLine.findMany({
        where: {
          receipt: { companyId },
          processedAt: { gte: analysisStart },
        },
        select: {
          itemId: true,
          qty: true,
          item: {
            select: {
              itemCode: true,
              itemName: true,
            },
          },
          processedAt: true,
        },
      }),
      this.prisma.outboundLine.findMany({
        where: {
          order: {
            companyId,
            deliveredAt: { gte: previousStart, lt: analysisStart },
          },
        },
        select: {
          itemId: true,
          deliveredQty: true,
          item: {
            select: {
              itemCode: true,
              itemName: true,
            },
          },
        },
      }),
      this.prisma.returnReceiptLine.findMany({
        where: {
          receipt: { companyId },
          processedAt: { gte: previousStart, lt: analysisStart },
        },
        select: { qty: true },
      }),
      this.prisma.outboundLine.findMany({
        where: {
          order: {
            companyId,
            deliveredAt: { gte: analysisStart },
          },
        },
        select: {
          deliveredQty: true,
          order: {
            select: {
              customerId: true,
              customer: {
                select: {
                  customerName: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.returnReceiptLine.findMany({
        where: {
          receipt: { companyId },
          processedAt: { gte: analysisStart },
        },
        select: {
          qty: true,
          receipt: {
            select: {
              customerId: true,
              customer: {
                select: {
                  customerName: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.pickAllocation.findMany({
        where: {
          companyId,
          outboundLine: {
            order: { deliveredAt: { gte: analysisStart } },
          },
          isReleased: false,
        },
        select: {
          qty: true,
          warehouse: { select: { type: true } },
        },
      }),
      this.prisma.returnReceiptLine.findMany({
        where: {
          receipt: { companyId },
          processedAt: { gte: analysisStart },
        },
        select: {
          qty: true,
          storageType: true,
        },
      }),
    ]);

    const alertsById = new Map<
      string,
      DashboardSummaryResponse['alerts'][number]
    >();
    if (
      inboundInvalidPending >= DASHBOARD_ALERT_MIN_VALUE.inboundInvalidPending
    ) {
      alertsById.set('inbound-invalid-pending', {
        id: 'inbound-invalid-pending',
        level: 'warning',
        label: '오류 포함 입고 업로드',
        value: inboundInvalidPending,
        href: '/inbound',
      });
    }
    if (overdueOutbound >= DASHBOARD_ALERT_MIN_VALUE.overdueOutbound) {
      alertsById.set('outbound-overdue', {
        id: 'outbound-overdue',
        level: 'critical',
        label: '출고 지연 오더',
        value: overdueOutbound,
        href: '/outbound',
      });
    }
    if (
      returnsDecidedPending >= DASHBOARD_ALERT_MIN_VALUE.returnsDecidedPending
    ) {
      alertsById.set('returns-decided-pending', {
        id: 'returns-decided-pending',
        level: 'info',
        label: '판정 후 미처리 반품',
        value: returnsDecidedPending,
        href: '/returns',
      });
    }
    const alerts = Array.from(alertsById.values());
    alerts.sort((a, b) => {
      const levelGap =
        ALERT_LEVEL_PRIORITY[b.level] - ALERT_LEVEL_PRIORITY[a.level];
      if (levelGap !== 0) return levelGap;
      return b.value - a.value;
    });

    const todos: DashboardSummaryResponse['todos'] = [];
    if (role === Role.ADMIN || role === Role.WH_MANAGER) {
      todos.push({
        id: 'todo-inbound-confirm',
        label: '입고 확정',
        value: inboundPending,
        href: '/inbound',
      });
      todos.push({
        id: 'todo-returns-decide',
        label: '반품 결정 → 반품',
        value: returnsDecidedPending,
        href: '/returns',
      });
    }
    if (role === Role.ADMIN || role === Role.WH_MANAGER) {
      todos.push({
        id: 'todo-temperature-record',
        label: '오늘 온도 기록 (COOL/FRZ)',
        value: temperatureRecordedToday > 0 ? 0 : 1,
        href: '/temperature-monitor',
      });
    }
    if (role === Role.ADMIN || role === Role.DELIVERY) {
      todos.push({
        id: 'todo-outbound-shipping',
        label: '피킹 대기 → 출고',
        value: outboundInProgress,
        href: '/outbound',
      });
    }
    if (role === Role.ADMIN) {
      todos.push({
        id: 'todo-approvals',
        label: '회원 승인',
        value: approvalPending,
        href: '/approvals',
      });
    }

    const metricByItem = new Map<
      string,
      {
        itemId: string;
        itemCode: string;
        itemName: string;
        outboundQty: number;
        returnQty: number;
        returnRate: number;
      }
    >();

    outboundLines.forEach((line) => {
      const existing = metricByItem.get(line.itemId);
      const outboundQty = Number(line.deliveredQty.toString());
      if (!existing) {
        metricByItem.set(line.itemId, {
          itemId: line.itemId,
          itemCode: line.item.itemCode,
          itemName: line.item.itemName,
          outboundQty,
          returnQty: 0,
          returnRate: 0,
        });
        return;
      }
      existing.outboundQty += outboundQty;
    });

    returnLines.forEach((line) => {
      const existing = metricByItem.get(line.itemId);
      const returnQty = Number(line.qty.toString());
      if (!existing) {
        metricByItem.set(line.itemId, {
          itemId: line.itemId,
          itemCode: line.item.itemCode,
          itemName: line.item.itemName,
          outboundQty: 0,
          returnQty,
          returnRate: 0,
        });
        return;
      }
      existing.returnQty += returnQty;
    });

    const itemMetrics = Array.from(metricByItem.values()).map((metric) => {
      const returnRate =
        metric.outboundQty > 0
          ? (metric.returnQty / metric.outboundQty) * 100
          : 0;
      return {
        ...metric,
        outboundQty: Number(metric.outboundQty.toFixed(3)),
        returnQty: Number(metric.returnQty.toFixed(3)),
        returnRate: Number(returnRate.toFixed(2)),
      };
    });

    const topOutboundItems = [...itemMetrics]
      .sort((a, b) => b.outboundQty - a.outboundQty)
      .slice(0, 5);

    const worstOutboundItems = [...itemMetrics]
      .filter((item) => item.outboundQty > 0)
      .sort((a, b) => a.outboundQty - b.outboundQty)
      .slice(0, 5);

    const topReturnRateItems = [...itemMetrics]
      .filter((item) => item.outboundQty >= 1)
      .sort((a, b) => b.returnRate - a.returnRate)
      .slice(0, 5);

    const trendSeries = trendBuckets.map((bucket) => ({
      label: bucket.label,
      start: bucket.start.toISOString(),
      end: bucket.end.toISOString(),
      outboundQty: 0,
      returnQty: 0,
      returnRate: 0,
      isOverTarget: false,
      drilldownQuery: {
        path: '/outbound' as const,
        query: {
          from: bucket.start.toISOString().slice(0, 10),
          to: bucket.end.toISOString().slice(0, 10),
        },
      },
    }));

    outboundLines.forEach((line) => {
      const deliveredAt = line.order.deliveredAt;
      if (!deliveredAt) return;
      const idx = findBucketIndex(deliveredAt, trendBuckets);
      if (idx < 0) return;
      trendSeries[idx].outboundQty += Number(line.deliveredQty.toString());
    });

    returnLines.forEach((line) => {
      if (!line.processedAt) return;
      const idx = findBucketIndex(line.processedAt, trendBuckets);
      if (idx < 0) return;
      trendSeries[idx].returnQty += Number(line.qty.toString());
    });

    trendSeries.forEach((point) => {
      point.outboundQty = Number(point.outboundQty.toFixed(3));
      point.returnQty = Number(point.returnQty.toFixed(3));
      point.returnRate =
        point.outboundQty > 0
          ? Number(((point.returnQty / point.outboundQty) * 100).toFixed(2))
          : 0;
      point.isOverTarget = point.returnRate > normalizedTarget;
    });

    const segmentComparison = buildSegmentComparison({
      segmentBy,
      targetReturnRate: normalizedTarget,
      customerOutbound: customerSegmentOutboundLines,
      customerReturns: customerSegmentReturnLines,
      warehouseOutbound: warehouseSegmentOutboundAllocations,
      warehouseReturns: warehouseSegmentReturnLines,
    });

    const previousMap = new Map<
      string,
      { itemCode: string; itemName: string; previousOutboundQty: number }
    >();
    previousOutboundLines.forEach((line) => {
      const prev = previousMap.get(line.itemId);
      const qty = Number(line.deliveredQty.toString());
      if (!prev) {
        previousMap.set(line.itemId, {
          itemCode: line.item.itemCode,
          itemName: line.item.itemName,
          previousOutboundQty: qty,
        });
        return;
      }
      prev.previousOutboundQty += qty;
    });

    const anomalies = itemMetrics
      .map((metric) => {
        const previous =
          previousMap.get(metric.itemId)?.previousOutboundQty ?? 0;
        const growthRate =
          previous > 0 ? ((metric.outboundQty - previous) / previous) * 100 : 0;
        return {
          itemId: metric.itemId,
          itemCode: metric.itemCode,
          itemName: metric.itemName,
          currentOutboundQty: metric.outboundQty,
          previousOutboundQty: Number(previous.toFixed(3)),
          growthRate: Number(growthRate.toFixed(2)),
          drilldownQuery: {
            path: '/outbound' as const,
            query: {
              itemId: metric.itemId,
              from: analysisStart.toISOString().slice(0, 10),
              to: now.toISOString().slice(0, 10),
            },
          },
        };
      })
      .filter((row) => row.previousOutboundQty >= 1 && row.growthRate >= 30)
      .sort((a, b) => b.growthRate - a.growthRate)
      .slice(0, 10);

    const returnByItem = [...itemMetrics]
      .filter((item) => item.returnQty > 0)
      .sort((a, b) => b.returnQty - a.returnQty);
    const totalReturnQty = returnByItem.reduce(
      (sum, item) => sum + item.returnQty,
      0,
    );
    let cumulative = 0;
    const paretoItems: DashboardSummaryResponse['analysis']['pareto']['items'] =
      [];
    returnByItem.forEach((item) => {
      if (totalReturnQty <= 0) return;
      cumulative += item.returnQty;
      const cumulativeShare = (cumulative / totalReturnQty) * 100;
      paretoItems.push({
        itemId: item.itemId,
        itemCode: item.itemCode,
        itemName: item.itemName,
        returnQty: item.returnQty,
        cumulativeShare: Number(cumulativeShare.toFixed(2)),
        drilldownQuery: {
          path: '/outbound',
          query: {
            itemId: item.itemId,
            from: analysisStart.toISOString().slice(0, 10),
            to: now.toISOString().slice(0, 10),
          },
        },
      });
    });
    const pareto80 = paretoItems.filter((item) => item.cumulativeShare <= 80);
    const pareto = pareto80.length > 0 ? pareto80 : paretoItems.slice(0, 1);
    const coverageRate =
      pareto.length > 0 ? pareto[pareto.length - 1].cumulativeShare : 0;

    const stockShortageCount = stockShortageGroups.filter(
      (g) => Number(g._sum.onHand ?? 0) < 0,
    ).length;

    return {
      asOf: now.toISOString(),
      analysis: {
        range,
        segmentBy,
        targetLine: normalizedTarget,
        trendSeries,
        segmentComparison,
        anomalies,
        pareto: {
          totalReturnQty: Number(totalReturnQty.toFixed(3)),
          coverageRate: Number(coverageRate.toFixed(2)),
          items: pareto,
        },
        topOutboundItems,
        worstOutboundItems,
        topReturnRateItems,
        prevOutboundTotal: previousOutboundLines.reduce(
          (sum, l) => sum + Number(l.deliveredQty.toString()),
          0,
        ),
        prevReturnTotal: previousReturnLines.reduce(
          (sum, l) => sum + Number(l.qty.toString()),
          0,
        ),
      },
      kpis: {
        totalItems,
        inboundPending,
        outboundInProgress,
        returnsToday,
        approvalPending,
        outboundCompletedToday,
        stockShortageCount,
      },
      inventoryInsights: {
        expirySoonCount: expiryWithin7 + expiryWithin14 + expiryWithin30,
        expiryByDays: {
          within7: expiryWithin7,
          within14: expiryWithin14,
          within30: expiryWithin30,
          within60: expiryWithin60,
          within90: expiryWithin90,
        },
        shortageCount: stockShortageCount,
      },
      alerts: alerts.slice(0, DASHBOARD_ALERT_TOP_N),
      todos,
    };
  }
}

function startOfRange(now: Date, range: DashboardAnalyticsRange): Date {
  if (range === DashboardAnalyticsRange.WEEK) {
    const day = now.getDay();
    const diffToMonday = (day + 6) % 7;
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - diffToMonday,
    );
  }
  if (range === DashboardAnalyticsRange.QUARTER) {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    return new Date(now.getFullYear(), quarterStartMonth, 1);
  }
  if (range === DashboardAnalyticsRange.HALF) {
    return new Date(now.getFullYear(), now.getMonth() < 6 ? 0 : 6, 1);
  }
  return new Date(now.getFullYear(), 0, 1);
}

type TrendBucket = {
  label: string;
  start: Date;
  end: Date;
};

function buildTrendBuckets(
  now: Date,
  range: DashboardAnalyticsRange,
): TrendBucket[] {
  if (range === DashboardAnalyticsRange.WEEK) {
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 6,
    );
    return Array.from({ length: 7 }, (_, idx) => {
      const bucketStart = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + idx,
      );
      const bucketEnd = new Date(
        bucketStart.getFullYear(),
        bucketStart.getMonth(),
        bucketStart.getDate() + 1,
      );
      return {
        label: `${bucketStart.getMonth() + 1}/${bucketStart.getDate()}`,
        start: bucketStart,
        end: bucketEnd,
      };
    });
  }

  if (range === DashboardAnalyticsRange.QUARTER) {
    const currentWeek = startOfWeek(now);
    return Array.from({ length: 13 }, (_, idx) => {
      const bucketStart = new Date(currentWeek);
      bucketStart.setDate(currentWeek.getDate() - (12 - idx) * 7);
      const bucketEnd = new Date(bucketStart);
      bucketEnd.setDate(bucketStart.getDate() + 7);
      return {
        label: `${bucketStart.getMonth() + 1}/${bucketStart.getDate()}`,
        start: bucketStart,
        end: bucketEnd,
      };
    });
  }

  const months = range === DashboardAnalyticsRange.HALF ? 6 : 12;
  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth() - (months - 1),
    1,
  );
  return Array.from({ length: months }, (_, idx) => {
    const bucketStart = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() + idx,
      1,
    );
    const bucketEnd = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() + idx + 1,
      1,
    );
    return {
      label: `${bucketStart.getFullYear()}-${String(bucketStart.getMonth() + 1).padStart(2, '0')}`,
      start: bucketStart,
      end: bucketEnd,
    };
  });
}

function findBucketIndex(date: Date, buckets: TrendBucket[]): number {
  for (let i = 0; i < buckets.length; i += 1) {
    if (date >= buckets[i].start && date < buckets[i].end) return i;
  }
  return -1;
}

function startOfWeek(now: Date): Date {
  const day = now.getDay();
  const diff = (day + 6) % 7;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
}

function startOfPreviousWindow(
  currentStart: Date,
  range: DashboardAnalyticsRange,
): Date {
  if (range === DashboardAnalyticsRange.WEEK) {
    return new Date(
      currentStart.getFullYear(),
      currentStart.getMonth(),
      currentStart.getDate() - 7,
    );
  }
  if (range === DashboardAnalyticsRange.QUARTER) {
    const date = new Date(currentStart);
    date.setDate(date.getDate() - 13 * 7);
    return date;
  }
  if (range === DashboardAnalyticsRange.HALF) {
    return new Date(currentStart.getFullYear(), currentStart.getMonth() - 6, 1);
  }
  return new Date(currentStart.getFullYear() - 1, currentStart.getMonth(), 1);
}

function buildSegmentComparison(params: {
  segmentBy: DashboardSegmentBy;
  targetReturnRate: number;
  customerOutbound: Array<{
    deliveredQty: { toString: () => string };
    order: { customerId: string; customer: { customerName: string } };
  }>;
  customerReturns: Array<{
    qty: { toString: () => string };
    receipt: {
      customerId: string | null;
      customer: { customerName: string } | null;
    };
  }>;
  warehouseOutbound: Array<{
    qty: { toString: () => string };
    warehouse: { type: StorageType };
  }>;
  warehouseReturns: Array<{
    qty: { toString: () => string };
    storageType: StorageType;
  }>;
}) {
  if (params.segmentBy === DashboardSegmentBy.CUSTOMER) {
    const map = new Map<
      string,
      {
        key: string;
        label: string;
        outboundQty: number;
        returnQty: number;
        returnRate: number;
        drilldownQuery: { path: '/outbound'; query: Record<string, string> };
      }
    >();
    params.customerOutbound.forEach((line) => {
      const key = line.order.customerId;
      const item = map.get(key);
      const qty = Number(line.deliveredQty.toString());
      if (!item) {
        map.set(key, {
          key,
          label: line.order.customer.customerName,
          outboundQty: qty,
          returnQty: 0,
          returnRate: 0,
          drilldownQuery: {
            path: '/outbound',
            query: { customerId: key },
          },
        });
        return;
      }
      item.outboundQty += qty;
    });
    params.customerReturns.forEach((line) => {
      const key = line.receipt.customerId ?? 'UNKNOWN';
      const label = line.receipt.customer?.customerName ?? '미지정 고객사';
      const item = map.get(key);
      const qty = Number(line.qty.toString());
      if (!item) {
        map.set(key, {
          key,
          label,
          outboundQty: 0,
          returnQty: qty,
          returnRate: 0,
          drilldownQuery: {
            path: '/outbound',
            query: key === 'UNKNOWN' ? {} : { customerId: key },
          },
        });
        return;
      }
      item.returnQty += qty;
    });
    return Array.from(map.values())
      .map((item) => ({
        ...item,
        outboundQty: Number(item.outboundQty.toFixed(3)),
        returnQty: Number(item.returnQty.toFixed(3)),
        returnRate:
          item.outboundQty > 0
            ? Number(((item.returnQty / item.outboundQty) * 100).toFixed(2))
            : 0,
      }))
      .sort((a, b) => b.outboundQty - a.outboundQty)
      .slice(0, DASHBOARD_SEGMENT_TOP_N);
  }

  const map = new Map<
    string,
    {
      key: string;
      label: string;
      outboundQty: number;
      returnQty: number;
      returnRate: number;
      drilldownQuery: { path: '/outbound'; query: Record<string, string> };
    }
  >();
  (['DRY', 'COOL', 'FRZ'] as StorageType[]).forEach((type) => {
    map.set(type, {
      key: type,
      label: type,
      outboundQty: 0,
      returnQty: 0,
      returnRate: 0,
      drilldownQuery: { path: '/outbound', query: { storageType: type } },
    });
  });
  params.warehouseOutbound.forEach((line) => {
    const row = map.get(line.warehouse.type);
    if (!row) return;
    row.outboundQty += Number(line.qty.toString());
  });
  params.warehouseReturns.forEach((line) => {
    const row = map.get(line.storageType);
    if (!row) return;
    row.returnQty += Number(line.qty.toString());
  });
  return Array.from(map.values())
    .map((item) => ({
      ...item,
      outboundQty: Number(item.outboundQty.toFixed(3)),
      returnQty: Number(item.returnQty.toFixed(3)),
      returnRate:
        item.outboundQty > 0
          ? Number(((item.returnQty / item.outboundQty) * 100).toFixed(2))
          : 0,
      isOverTarget:
        item.outboundQty > 0 &&
        (item.returnQty / item.outboundQty) * 100 > params.targetReturnRate,
    }))
    .sort((a, b) => b.outboundQty - a.outboundQty)
    .slice(0, DASHBOARD_SEGMENT_TOP_N);
}
