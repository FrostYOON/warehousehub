import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  InventoryTxType,
  Prisma,
  StocktakingStatus,
} from '@prisma/client';
import { CreateStocktakingDto } from './dto/create-stocktaking.dto';
import { AddLinesDto } from './dto/add-lines.dto';
import { UpdateLineActualQtyDto } from './dto/update-line-actual-qty.dto';
import { ListStocktakingQueryDto } from './dto/list-stocktaking-query.dto';

function asNumber(v: Prisma.Decimal | number): number {
  return typeof v === 'number' ? v : Number(v.toString());
}

@Injectable()
export class StocktakingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, userId: string, dto: CreateStocktakingDto) {
    const wh = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, companyId },
    });
    if (!wh) throw new NotFoundException('창고를 찾을 수 없습니다.');

    return this.prisma.stocktaking.create({
      data: {
        companyId,
        warehouseId: dto.warehouseId,
        status: StocktakingStatus.DRAFT,
        memo: dto.memo?.trim() || null,
        createdByUserId: userId,
      },
      include: {
        warehouse: { select: { id: true, name: true, type: true } },
      },
    });
  }

  async list(companyId: string, query: ListStocktakingQueryDto) {
    const { status, warehouseId, page = 1, pageSize = 20 } = query;
    const skip = (Math.max(1, page) - 1) * Math.min(50, Math.max(1, pageSize));
    const take = Math.min(50, Math.max(1, pageSize));

    const where: Prisma.StocktakingWhereInput = { companyId };
    if (status) where.status = status as StocktakingStatus;
    if (warehouseId) where.warehouseId = warehouseId;

    const [items, total] = await Promise.all([
      this.prisma.stocktaking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          warehouse: { select: { id: true, name: true, type: true } },
          _count: { select: { lines: true } },
        },
      }),
      this.prisma.stocktaking.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize: take,
      totalPages: Math.ceil(total / take),
    };
  }

  async getOne(companyId: string, id: string) {
    const st = await this.prisma.stocktaking.findFirst({
      where: { id, companyId },
      include: {
        warehouse: { select: { id: true, name: true, type: true } },
        lines: {
          include: {
            lot: {
              select: {
                id: true,
                expiryDate: true,
                item: { select: { itemCode: true, itemName: true } },
              },
            },
          },
        },
      },
    });
    if (!st) throw new NotFoundException('재고 실사를 찾을 수 없습니다.');
    return st;
  }

  async addLines(companyId: string, id: string, dto: AddLinesDto) {
    const st = await this.prisma.stocktaking.findFirst({
      where: { id, companyId },
      select: { id: true, warehouseId: true, status: true },
    });
    if (!st) throw new NotFoundException('재고 실사를 찾을 수 없습니다.');
    if (st.status !== StocktakingStatus.DRAFT && st.status !== StocktakingStatus.IN_PROGRESS) {
      throw new BadRequestException('DRAFT 또는 IN_PROGRESS 상태에서만 라인 추가가 가능합니다.');
    }

    if (!dto.lines?.length) {
      throw new BadRequestException('lines는 비어있을 수 없습니다.');
    }

    const lotIds = [...new Set(dto.lines.map((l) => l.lotId))];
    const stocks = await this.prisma.stock.findMany({
      where: {
        companyId,
        warehouseId: st.warehouseId,
        lotId: { in: lotIds },
      },
      select: { lotId: true, onHand: true },
    });
    const stockMap = new Map(stocks.map((s) => [s.lotId, asNumber(s.onHand)]));

    const existingLotIds = await this.prisma.stocktakingLine.findMany({
      where: { stocktakingId: id },
      select: { lotId: true },
    });
    const existingSet = new Set(existingLotIds.map((l) => l.lotId));

    const toCreate = dto.lines.filter((l) => !existingSet.has(l.lotId));
    if (toCreate.length === 0) {
      return this.getOne(companyId, id);
    }

    await this.prisma.stocktakingLine.createMany({
      data: toCreate.map((l) => ({
        stocktakingId: id,
        lotId: l.lotId,
        systemQty: new Prisma.Decimal(String(stockMap.get(l.lotId) ?? 0)),
      })),
    });

    if (st.status === StocktakingStatus.DRAFT) {
      await this.prisma.stocktaking.update({
        where: { id },
        data: { status: StocktakingStatus.IN_PROGRESS },
      });
    }

    return this.getOne(companyId, id);
  }

  async updateLineActualQty(
    companyId: string,
    id: string,
    lineId: string,
    dto: UpdateLineActualQtyDto,
  ) {
    const st = await this.prisma.stocktaking.findFirst({
      where: { id, companyId },
      select: { status: true },
    });
    if (!st) throw new NotFoundException('재고 실사를 찾을 수 없습니다.');
    if (st.status !== StocktakingStatus.IN_PROGRESS) {
      throw new BadRequestException('IN_PROGRESS 상태에서만 실사 수량 수정이 가능합니다.');
    }

    const line = await this.prisma.stocktakingLine.findFirst({
      where: { id: lineId, stocktakingId: id },
    });
    if (!line) throw new NotFoundException('실사 라인을 찾을 수 없습니다.');

    const actualQty = new Prisma.Decimal(dto.actualQty);
    if (actualQty.lessThan(0)) {
      throw new BadRequestException('실사 수량은 0 이상이어야 합니다.');
    }

    await this.prisma.stocktakingLine.update({
      where: { id: lineId },
      data: { actualQty },
    });

    return this.getOne(companyId, id);
  }

  async confirm(companyId: string, id: string, userId: string) {
    const st = await this.prisma.stocktaking.findFirst({
      where: { id, companyId },
      include: {
        lines: true,
        warehouse: { select: { id: true, name: true } },
      },
    });
    if (!st) throw new NotFoundException('재고 실사를 찾을 수 없습니다.');
    if (st.status !== StocktakingStatus.IN_PROGRESS) {
      throw new BadRequestException('IN_PROGRESS 상태에서만 확정이 가능합니다.');
    }

    const linesWithActual = st.lines.filter((l) => l.actualQty != null);
    if (linesWithActual.length === 0) {
      throw new BadRequestException('실사 수량이 입력된 라인이 없습니다.');
    }

    await this.prisma.$transaction(async (tx) => {
      const inventoryTx = await tx.inventoryTx.create({
        data: {
          companyId,
          type: InventoryTxType.ADJUSTMENT,
          actorUserId: userId,
          refType: 'STOCKTAKING',
          refId: id,
          memo: `재고 실사 확정: ${st.warehouse?.name ?? st.warehouseId}`,
        },
      });

      for (const line of linesWithActual) {
        const sysQty = asNumber(line.systemQty);
        const actQty = asNumber(line.actualQty!);
        const qtyDelta = actQty - sysQty;
        if (qtyDelta === 0) continue;

        const stock = await tx.stock.findFirst({
          where: {
            companyId,
            warehouseId: st.warehouseId,
            lotId: line.lotId,
          },
        });
        if (!stock) {
          if (qtyDelta > 0) {
            await tx.stock.create({
              data: {
                companyId,
                warehouseId: st.warehouseId,
                lotId: line.lotId,
                onHand: qtyDelta,
                reserved: 0,
              },
            });
          } else {
            continue;
          }
        } else {
          const newOnHand = asNumber(stock.onHand) + qtyDelta;
          if (newOnHand < 0) {
            throw new BadRequestException(
              `Lot ${line.lotId} 실사 후 재고가 음수가 될 수 없습니다.`,
            );
          }
          await tx.stock.update({
            where: { id: stock.id },
            data: { onHand: newOnHand },
          });
        }

        await tx.inventoryTxLine.create({
          data: {
            txId: inventoryTx.id,
            warehouseId: st.warehouseId,
            lotId: line.lotId,
            qtyDelta,
          },
        });
      }

      await tx.stocktaking.update({
        where: { id },
        data: {
          status: StocktakingStatus.CONFIRMED,
          confirmedByUserId: userId,
          confirmedAt: new Date(),
        },
      });
    });

    return this.getOne(companyId, id);
  }
}
