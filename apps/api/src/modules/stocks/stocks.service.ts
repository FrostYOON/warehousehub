import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryTxType, Prisma, StorageType } from '@prisma/client';
import * as XLSX from 'xlsx';

type ItemAnalyticsRange = 'WEEK' | 'QUARTER' | 'HALF' | 'YEAR';

type TimeBucket = {
  key: string;
  label: string;
  start: Date;
  end: Date;
};

function asNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (value && typeof value === 'object' && 'toString' in value) {
    const text = String(value);
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function startOfWeek(value: Date): Date {
  const day = value.getDay();
  const diffToMonday = (day + 6) % 7;
  const result = startOfDay(value);
  result.setDate(result.getDate() - diffToMonday);
  return result;
}

function startOfQuarter(value: Date): Date {
  const month = value.getMonth();
  const quarterStart = Math.floor(month / 3) * 3;
  return new Date(value.getFullYear(), quarterStart, 1);
}

function startOfHalf(value: Date): Date {
  const month = value.getMonth();
  return new Date(value.getFullYear(), month < 6 ? 0 : 6, 1);
}

function startOfYear(value: Date): Date {
  return new Date(value.getFullYear(), 0, 1);
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(value: Date, months: number): Date {
  return new Date(value.getFullYear(), value.getMonth() + months, 1);
}

function addYears(value: Date, years: number): Date {
  return new Date(value.getFullYear() + years, 0, 1);
}

function labelForQuarter(date: Date): string {
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `${date.getFullYear()}-Q${quarter}`;
}

function labelForHalf(date: Date): string {
  const half = date.getMonth() < 6 ? 1 : 2;
  return `${date.getFullYear()}-H${half}`;
}

function buildBuckets(now: Date, range: ItemAnalyticsRange): TimeBucket[] {
  if (range === 'WEEK') {
    const base = startOfWeek(now);
    return Array.from({ length: 12 }, (_, idx) => {
      const start = addDays(base, (idx - 11) * 7);
      const end = addDays(start, 7);
      const weekNo = Math.ceil(
        (start.getTime() - new Date(start.getFullYear(), 0, 1).getTime()) /
          (7 * 24 * 60 * 60 * 1000),
      );
      return {
        key: start.toISOString(),
        label: `${start.getFullYear()}-W${String(Math.max(weekNo, 1)).padStart(2, '0')}`,
        start,
        end,
      };
    });
  }

  if (range === 'QUARTER') {
    const base = startOfQuarter(now);
    return Array.from({ length: 8 }, (_, idx) => {
      const start = addMonths(base, (idx - 7) * 3);
      const end = addMonths(start, 3);
      return { key: start.toISOString(), label: labelForQuarter(start), start, end };
    });
  }

  if (range === 'HALF') {
    const base = startOfHalf(now);
    return Array.from({ length: 6 }, (_, idx) => {
      const start = addMonths(base, (idx - 5) * 6);
      const end = addMonths(start, 6);
      return { key: start.toISOString(), label: labelForHalf(start), start, end };
    });
  }

  const base = startOfYear(now);
  return Array.from({ length: 5 }, (_, idx) => {
    const start = addYears(base, idx - 4);
    const end = addYears(start, 1);
    return { key: start.toISOString(), label: String(start.getFullYear()), start, end };
  });
}

function locateBucketIndex(timestamp: Date, buckets: TimeBucket[]): number {
  for (let i = 0; i < buckets.length; i += 1) {
    if (timestamp >= buckets[i].start && timestamp < buckets[i].end) {
      return i;
    }
  }
  return -1;
}

@Injectable()
export class StocksService {
  constructor(private readonly prisma: PrismaService) {}

  private stockWhere(params: {
    companyId: string;
    storageType?: StorageType;
    itemCode?: string;
  }): Prisma.StockWhereInput {
    const { companyId, storageType, itemCode } = params;
    const normalizedItemCode = itemCode?.trim() || undefined;
    return {
      companyId,
      warehouse: storageType ? { type: storageType } : undefined,
      lot: normalizedItemCode ? { item: { itemCode: normalizedItemCode } } : undefined,
    };
  }

  private async listRows(params: {
    companyId: string;
    storageType?: StorageType;
    itemCode?: string;
    skip?: number;
    take?: number;
  }) {
    const rows = await this.prisma.stock.findMany({
      where: this.stockWhere(params),
      orderBy: [
        {
          lot: {
            item: { itemCode: 'asc' },
          },
        },
        {
          lot: { expiryDate: 'asc' },
        },
        {
          warehouse: { type: 'asc' },
        },
        {
          warehouse: { name: 'asc' },
        },
      ],
      skip: params.skip,
      take: params.take,
      select: {
        id: true,
        onHand: true,
        reserved: true,
        updatedAt: true,
        warehouse: {
          select: {
            id: true,
            type: true,
            name: true,
          },
        },
        lot: {
          select: {
            id: true,
            expiryDate: true,
            item: {
              select: {
                id: true,
                itemCode: true,
                itemName: true,
              },
            },
          },
        },
      },
    });

    return rows.map((row) => ({
      ...row,
      onHand: Number(row.onHand.toString()),
      reserved: Number(row.reserved.toString()),
    }));
  }

  async list(params: {
    companyId: string;
    storageType?: StorageType;
    itemCode?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.max(1, Math.min(200, params.pageSize ?? 50));
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.listRows({
        companyId: params.companyId,
        storageType: params.storageType,
        itemCode: params.itemCode,
        skip,
        take: pageSize,
      }),
      this.prisma.stock.count({
        where: this.stockWhere({
          companyId: params.companyId,
          storageType: params.storageType,
          itemCode: params.itemCode,
        }),
      }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async exportStocks(params: {
    companyId: string;
    storageType?: StorageType;
    itemCode?: string;
  }) {
    const rows = await this.listRows({
      companyId: params.companyId,
      storageType: params.storageType,
      itemCode: params.itemCode,
    });
    const exportRows = rows.map((row) => {
      const available = row.onHand - row.reserved;
      return {
        창고타입: row.warehouse.type,
        창고명: row.warehouse.name,
        품목코드: row.lot.item.itemCode,
        품목명: row.lot.item.itemName,
        유통기한: row.lot.expiryDate ? row.lot.expiryDate.toISOString().slice(0, 10) : '',
        현재고: Number(row.onHand.toFixed(1)),
        예약: Number(row.reserved.toFixed(1)),
        가용: Number(available.toFixed(1)),
        최종수정시각: row.updatedAt.toISOString(),
      };
    });
    const sheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Stocks');
    return XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    }) as Buffer;
  }

  async listItems(companyId: string, keyword?: string) {
    const key = keyword?.trim();
    const where = key
      ? {
          companyId,
          isActive: true,
          OR: [
            { itemCode: { contains: key, mode: 'insensitive' as const } },
            { itemName: { contains: key, mode: 'insensitive' as const } },
          ],
        }
      : { companyId, isActive: true };

    const items = await this.prisma.item.findMany({
      where,
      select: {
        id: true,
        itemCode: true,
        itemName: true,
      },
      orderBy: [{ itemCode: 'asc' }],
      take: 200,
    });
    return items;
  }

  async itemTrend(params: {
    companyId: string;
    itemId: string;
    range: ItemAnalyticsRange;
  }) {
    const { companyId, itemId, range } = params;
    const now = new Date();
    const buckets = buildBuckets(now, range);
    const windowStart = buckets[0].start;

    const [item, outboundLines, returnLines] = await Promise.all([
      this.prisma.item.findFirst({
        where: { id: itemId, companyId, isActive: true },
        select: { id: true, itemCode: true, itemName: true },
      }),
      this.prisma.outboundLine.findMany({
        where: {
          itemId,
          order: {
            companyId,
            deliveredAt: { gte: windowStart },
          },
        },
        select: {
          deliveredQty: true,
          order: {
            select: {
              deliveredAt: true,
            },
          },
        },
      }),
      this.prisma.returnReceiptLine.findMany({
        where: {
          itemId,
          receipt: { companyId },
          processedAt: { gte: windowStart },
        },
        select: {
          qty: true,
          processedAt: true,
        },
      }),
    ]);

    if (!item) {
      return {
        item: null,
        range,
        buckets: buckets.map((bucket) => ({
          label: bucket.label,
          outboundQty: 0,
          returnQty: 0,
          returnRate: 0,
        })),
        totals: {
          outboundQty: 0,
          returnQty: 0,
          returnRate: 0,
        },
        asOf: now.toISOString(),
      };
    }

    const series = buckets.map((bucket) => ({
      label: bucket.label,
      outboundQty: 0,
      returnQty: 0,
      returnRate: 0,
    }));

    outboundLines.forEach((line) => {
      if (!line.order.deliveredAt) return;
      const idx = locateBucketIndex(line.order.deliveredAt, buckets);
      if (idx < 0) return;
      series[idx].outboundQty += asNumber(line.deliveredQty);
    });

    returnLines.forEach((line) => {
      if (!line.processedAt) return;
      const idx = locateBucketIndex(line.processedAt, buckets);
      if (idx < 0) return;
      series[idx].returnQty += asNumber(line.qty);
    });

    series.forEach((bucket) => {
      bucket.returnRate =
        bucket.outboundQty > 0 ? (bucket.returnQty / bucket.outboundQty) * 100 : 0;
      bucket.outboundQty = Number(bucket.outboundQty.toFixed(3));
      bucket.returnQty = Number(bucket.returnQty.toFixed(3));
      bucket.returnRate = Number(bucket.returnRate.toFixed(2));
    });

    const outboundTotal = series.reduce((sum, bucket) => sum + bucket.outboundQty, 0);
    const returnTotal = series.reduce((sum, bucket) => sum + bucket.returnQty, 0);
    const returnRate = outboundTotal > 0 ? (returnTotal / outboundTotal) * 100 : 0;

    return {
      item,
      range,
      buckets: series,
      totals: {
        outboundQty: Number(outboundTotal.toFixed(3)),
        returnQty: Number(returnTotal.toFixed(3)),
        returnRate: Number(returnRate.toFixed(2)),
      },
      asOf: now.toISOString(),
    };
  }

  async updateStock(params: {
    companyId: string;
    actorUserId: string;
    stockId: string;
    onHand: number;
    reserved: number;
    memo?: string;
  }) {
    const { companyId, actorUserId, stockId, onHand, reserved, memo } = params;
    if (onHand < 0 || reserved < 0) {
      throw new BadRequestException('수량은 0 이상이어야 합니다.');
    }

    const current = await this.prisma.stock.findFirst({
      where: { id: stockId, companyId },
      select: {
        id: true,
        warehouseId: true,
        lotId: true,
        onHand: true,
      },
    });
    if (!current) {
      throw new NotFoundException('재고를 찾을 수 없습니다.');
    }

    const normalizedOnHand = Number(onHand.toFixed(1));
    const normalizedReserved = Number(reserved.toFixed(1));
    const onHandDecimal = new Prisma.Decimal(normalizedOnHand.toFixed(1));
    const reservedDecimal = new Prisma.Decimal(normalizedReserved.toFixed(1));
    const deltaOnHand = new Prisma.Decimal(
      (normalizedOnHand - asNumber(current.onHand)).toFixed(1),
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.stock.update({
        where: { id: stockId },
        data: {
          onHand: onHandDecimal,
          reserved: reservedDecimal,
        },
      });

      const inventoryTx = await tx.inventoryTx.create({
        data: {
          companyId,
          type: InventoryTxType.ADJUSTMENT,
          actorUserId,
          refType: 'STOCK_MANUAL_ADJUST',
          refId: stockId,
          memo: memo?.trim() || '관리자 재고 수동 조정',
        },
      });

      if (!deltaOnHand.isZero()) {
        await tx.inventoryTxLine.create({
          data: {
            txId: inventoryTx.id,
            warehouseId: current.warehouseId,
            lotId: current.lotId,
            qtyDelta: deltaOnHand,
          },
        });
      }
    });

    const updated = await this.prisma.stock.findFirst({
      where: { id: stockId, companyId },
      select: {
        id: true,
        onHand: true,
        reserved: true,
        updatedAt: true,
        warehouse: {
          select: {
            id: true,
            type: true,
            name: true,
          },
        },
        lot: {
          select: {
            id: true,
            expiryDate: true,
            item: {
              select: {
                id: true,
                itemCode: true,
                itemName: true,
              },
            },
          },
        },
      },
    });

    if (!updated) {
      throw new NotFoundException('수정된 재고를 찾을 수 없습니다.');
    }

    return {
      ...updated,
      onHand: Number(updated.onHand.toString()),
      reserved: Number(updated.reserved.toString()),
    };
  }
}
