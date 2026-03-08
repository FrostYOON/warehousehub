import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '@prisma/client';

function asNumber(value: Prisma.Decimal | number | null): number {
  if (value == null) return 0;
  return typeof value === 'number' ? value : value.toNumber();
}

@Injectable()
export class CostService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 입고 원가 이력 (INBOUND_CONFIRM 트랜잭션 + unitCost)
   */
  async getInboundCostHistory(
    companyId: string,
    opts?: { page?: number; pageSize?: number; itemId?: string; from?: Date; to?: Date },
  ) {
    const page = Math.max(1, opts?.page ?? 1);
    const pageSize = Math.max(1, Math.min(100, opts?.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.InventoryTxWhereInput = {
      companyId,
      type: 'INBOUND_CONFIRM',
      refType: 'InboundUpload',
      ...(opts?.from || opts?.to
        ? {
            createdAt: {
              ...(opts?.from ? { gte: opts.from } : {}),
              ...(opts?.to ? { lte: opts.to } : {}),
            },
          }
        : {}),
    };

    const lineWhere: Prisma.InventoryTxLineWhereInput | undefined = opts?.itemId
      ? { lot: { itemId: opts.itemId } }
      : undefined;

    const [txList, total] = await Promise.all([
      this.prisma.inventoryTx.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          refId: true,
          createdAt: true,
          lines: {
            where: lineWhere,
            select: {
              id: true,
              qtyDelta: true,
              unitCost: true,
              lotId: true,
              lot: {
                select: {
                  itemId: true,
                  item: { select: { itemCode: true, itemName: true } },
                  expiryDate: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.inventoryTx.count({ where }),
    ]);

    const items = txList.map((tx) => ({
      id: tx.id,
      refId: tx.refId,
      createdAt: tx.createdAt,
      lines: tx.lines.map((line) => ({
        id: line.id,
        itemCode: line.lot.item.itemCode,
        itemName: line.lot.item.itemName,
        itemId: line.lot.itemId,
        expiryDate: line.lot.expiryDate,
        qty: asNumber(line.qtyDelta),
        unitCost: line.unitCost != null ? asNumber(line.unitCost) : null,
        totalCost:
          line.unitCost != null
            ? asNumber(line.qtyDelta) * asNumber(line.unitCost)
            : null,
      })),
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  /**
   * 품목별 원가 요약 (Item unitCost + 입고 누적)
   */
  async getItemsCostSummary(
    companyId: string,
    opts?: { q?: string; page?: number; pageSize?: number },
  ) {
    const page = Math.max(1, opts?.page ?? 1);
    const pageSize = Math.max(1, Math.min(200, opts?.pageSize ?? 50));
    const skip = (page - 1) * pageSize;
    const q = opts?.q?.trim();

    const where: Prisma.ItemWhereInput = {
      companyId,
      isActive: true,
      ...(q
        ? {
            OR: [
              { itemCode: { contains: q, mode: 'insensitive' } },
              { itemName: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const items = await this.prisma.item.findMany({
      where,
      orderBy: { itemCode: 'asc' },
      skip,
      take: pageSize,
      select: {
        id: true,
        itemCode: true,
        itemName: true,
        unitCost: true,
      },
    });

    const total = await this.prisma.item.count({ where });

    const result = items.map((item) => ({
      id: item.id,
      itemCode: item.itemCode,
      itemName: item.itemName,
      unitCost: item.unitCost != null ? asNumber(item.unitCost) : null,
    }));

    return {
      items: result,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }
}
