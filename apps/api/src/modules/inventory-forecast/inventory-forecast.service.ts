import { Injectable } from '@nestjs/common';
import { OutboundStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

function asNumber(value: Prisma.Decimal | number | null): number {
  if (value == null) return 0;
  return typeof value === 'number' ? value : value.toNumber();
}

export type DemandForecastItem = {
  itemId: string;
  itemCode: string;
  itemName: string;
  /** 분석 기간 내 총 출고 수량 */
  totalOutboundQty: number;
  /** 일평균 출고 수량 (분석 기간 일수 기준) */
  avgDailyOutbound: number;
  /** 예측 기간(일) 동안 예상 수요 */
  forecastedDemand: number;
  /** 실제 출고가 있는 일수 */
  activeDays: number;
};

export type ReorderSuggestionItem = {
  itemId: string;
  itemCode: string;
  itemName: string;
  /** 현재 재고 (전 창고 합계) */
  currentStock: number;
  /** 일평균 출고 */
  avgDailyOutbound: number;
  /** 리드타임 동안 예상 소비량 */
  leadTimeDemand: number;
  /** 발주점 (리드타임 수요 + 안전재고) */
  reorderPoint: number;
  /** 제안 발주 수량 */
  suggestedQty: number;
  /** 재고 부족 심각도: low | medium | critical */
  urgency: 'low' | 'medium' | 'critical';
};

const DEFAULT_LOOKBACK_DAYS = 30;
const DEFAULT_FORECAST_DAYS = 7;
const DEFAULT_LEAD_TIME_DAYS = 7;
const DEFAULT_SAFETY_STOCK = 0;
const MIN_ACTIVE_DAYS_FOR_AVG = 1;

@Injectable()
export class InventoryForecastService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 출고(DELIVERED) 이력 기반 품목별 수요 예측
   * - OutboundLine.deliveredQty + order.deliveredAt 사용
   */
  async getDemandForecast(
    companyId: string,
    opts?: {
      lookbackDays?: number;
      forecastDays?: number;
      itemId?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const lookbackDays = Math.max(1, opts?.lookbackDays ?? DEFAULT_LOOKBACK_DAYS);
    const forecastDays = Math.max(1, opts?.forecastDays ?? DEFAULT_FORECAST_DAYS);
    const page = Math.max(1, opts?.page ?? 1);
    const pageSize = Math.max(1, Math.min(200, opts?.pageSize ?? 50));

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - lookbackDays);
    startDate.setHours(0, 0, 0, 0);

    const outboundLines = await this.prisma.outboundLine.findMany({
      where: {
        order: {
          companyId,
          status: OutboundStatus.DELIVERED,
          deliveredAt: { gte: startDate, lte: endDate },
        },
        ...(opts?.itemId ? { itemId: opts.itemId } : {}),
      },
      select: {
        itemId: true,
        deliveredQty: true,
        order: { select: { deliveredAt: true } },
        item: { select: { itemCode: true, itemName: true } },
      },
    });

    const byItem = new Map<
      string,
      { itemCode: string; itemName: string; totalQty: number; activeDaySet: Set<string> }
    >();
    for (const line of outboundLines) {
      const qty = asNumber(line.deliveredQty);
      if (qty <= 0) continue;
      const dayKey = line.order.deliveredAt
        ? line.order.deliveredAt.toISOString().slice(0, 10)
        : 'unknown';
      const existing = byItem.get(line.itemId);
      if (!existing) {
        byItem.set(line.itemId, {
          itemCode: line.item.itemCode,
          itemName: line.item.itemName,
          totalQty: qty,
          activeDaySet: new Set([dayKey]),
        });
      } else {
        existing.totalQty += qty;
        existing.activeDaySet.add(dayKey);
      }
    }

    const items: DemandForecastItem[] = Array.from(byItem.entries()).map(
      ([itemId, data]) => {
        const activeDays = Math.max(
          MIN_ACTIVE_DAYS_FOR_AVG,
          data.activeDaySet.size,
        );
        const avgDailyOutbound = data.totalQty / activeDays;
        const forecastedDemand = avgDailyOutbound * forecastDays;
        return {
          itemId,
          itemCode: data.itemCode,
          itemName: data.itemName,
          totalOutboundQty: Number(data.totalQty.toFixed(3)),
          avgDailyOutbound: Number(avgDailyOutbound.toFixed(3)),
          forecastedDemand: Number(forecastedDemand.toFixed(3)),
          activeDays,
        };
      },
    );

    items.sort((a, b) => b.totalOutboundQty - a.totalOutboundQty);
    const total = items.length;
    const skip = (page - 1) * pageSize;
    const pagedItems = items.slice(skip, skip + pageSize);

    return {
      items: pagedItems,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      params: {
        lookbackDays,
        forecastDays,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };
  }

  /**
   * 발주 제안: 현재 재고 + 수요 예측 기반으로 품목별 발주 수량 제안
   */
  async getReorderSuggestions(
    companyId: string,
    opts?: {
      lookbackDays?: number;
      leadTimeDays?: number;
      safetyStock?: number;
      itemId?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const lookbackDays = Math.max(1, opts?.lookbackDays ?? DEFAULT_LOOKBACK_DAYS);
    const leadTimeDays = Math.max(0, opts?.leadTimeDays ?? DEFAULT_LEAD_TIME_DAYS);
    const safetyStock = Math.max(0, opts?.safetyStock ?? DEFAULT_SAFETY_STOCK);
    const page = Math.max(1, opts?.page ?? 1);
    const pageSize = Math.max(1, Math.min(200, opts?.pageSize ?? 50));

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - lookbackDays);
    startDate.setHours(0, 0, 0, 0);

    const [outboundLines, stockByItem] = await Promise.all([
      this.prisma.outboundLine.findMany({
        where: {
          order: {
            companyId,
            status: OutboundStatus.DELIVERED,
            deliveredAt: { gte: startDate, lte: endDate },
          },
          ...(opts?.itemId ? { itemId: opts.itemId } : {}),
        },
        select: {
          itemId: true,
          deliveredQty: true,
          order: { select: { deliveredAt: true } },
          item: { select: { itemCode: true, itemName: true } },
        },
      }),
      this.getCurrentStockByItem(companyId, opts?.itemId),
    ]);

    const demandByItem = new Map<
      string,
      { itemCode: string; itemName: string; totalQty: number; activeDaySet: Set<string> }
    >();
    for (const line of outboundLines) {
      const qty = asNumber(line.deliveredQty);
      if (qty <= 0) continue;
      const dayKey = line.order.deliveredAt
        ? line.order.deliveredAt.toISOString().slice(0, 10)
        : 'unknown';
      const existing = demandByItem.get(line.itemId);
      if (!existing) {
        demandByItem.set(line.itemId, {
          itemCode: line.item.itemCode,
          itemName: line.item.itemName,
          totalQty: qty,
          activeDaySet: new Set([dayKey]),
        });
      } else {
        existing.totalQty += qty;
        existing.activeDaySet.add(dayKey);
      }
    }

    const suggestions: ReorderSuggestionItem[] = [];
    const processedItemIds = new Set<string>();

    for (const [itemId, data] of demandByItem) {
      processedItemIds.add(itemId);
      const activeDays = Math.max(MIN_ACTIVE_DAYS_FOR_AVG, data.activeDaySet.size);
      const avgDailyOutbound = data.totalQty / activeDays;
      const leadTimeDemand = avgDailyOutbound * leadTimeDays;
      const reorderPoint = leadTimeDemand + safetyStock;
      const currentStock = stockByItem.get(itemId) ?? 0;
      const suggestedQty = Math.max(0, Math.ceil(reorderPoint - currentStock));

      let urgency: ReorderSuggestionItem['urgency'] = 'low';
      if (currentStock <= 0 && avgDailyOutbound > 0) urgency = 'critical';
      else if (currentStock < leadTimeDemand) urgency = 'medium';

      suggestions.push({
        itemId,
        itemCode: data.itemCode,
        itemName: data.itemName,
        currentStock: Number(currentStock.toFixed(3)),
        avgDailyOutbound: Number(avgDailyOutbound.toFixed(3)),
        leadTimeDemand: Number(leadTimeDemand.toFixed(3)),
        reorderPoint: Number(reorderPoint.toFixed(3)),
        suggestedQty,
        urgency,
      });
    }

    const itemsWithStockNoDemand = Array.from(stockByItem.entries()).filter(
      ([itemId]) => !processedItemIds.has(itemId),
    );
    if (itemsWithStockNoDemand.length > 0) {
      const ids = itemsWithStockNoDemand.map(([id]) => id);
      const items = await this.prisma.item.findMany({
        where: { id: { in: ids }, companyId },
        select: { id: true, itemCode: true, itemName: true },
      });
      const itemMap = new Map(items.map((i) => [i.id, i]));
      for (const [itemId, currentStock] of itemsWithStockNoDemand) {
        const item = itemMap.get(itemId);
        if (!item) continue;
        const suggestedQty =
          currentStock < safetyStock ? Math.ceil(safetyStock - currentStock) : 0;
        if (suggestedQty > 0) {
          suggestions.push({
            itemId,
            itemCode: item.itemCode,
            itemName: item.itemName,
            currentStock: Number(currentStock.toFixed(3)),
            avgDailyOutbound: 0,
            leadTimeDemand: 0,
            reorderPoint: safetyStock,
            suggestedQty,
            urgency: currentStock < safetyStock ? 'medium' : 'low',
          });
        }
      }
    }

    const sorted = suggestions
      .filter((s) => s.suggestedQty > 0 || s.urgency === 'critical')
      .sort((a, b) => {
        const order = { critical: 0, medium: 1, low: 2 };
        return order[a.urgency] - order[b.urgency] || b.suggestedQty - a.suggestedQty;
      });

    const total = sorted.length;
    const skip = (page - 1) * pageSize;
    const pagedItems = sorted.slice(skip, skip + pageSize);

    return {
      items: pagedItems,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      params: {
        lookbackDays,
        leadTimeDays,
        safetyStock,
      },
    };
  }

  private async getCurrentStockByItem(
    companyId: string,
    itemId?: string,
  ): Promise<Map<string, number>> {
    const stocks = await this.prisma.stock.groupBy({
      by: ['lotId'],
      where: { companyId, ...(itemId ? { lot: { itemId } } : {}) },
      _sum: { onHand: true },
    });

    const lotIds = stocks.map((s) => s.lotId);
    const lots = await this.prisma.lot.findMany({
      where: { id: { in: lotIds } },
      select: { id: true, itemId: true },
    });
    const lotToItem = new Map(lots.map((l) => [l.id, l.itemId]));

    const result = new Map<string, number>();
    for (const s of stocks) {
      const itemId = lotToItem.get(s.lotId);
      if (!itemId) continue;
      const qty = asNumber(s._sum.onHand);
      result.set(itemId, (result.get(itemId) ?? 0) + qty);
    }
    return result;
  }
}
