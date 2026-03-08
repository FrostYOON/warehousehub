import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryTxType, Prisma, TransferStatus } from '@prisma/client';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { ListTransfersQueryDto } from './dto/list-transfers-query.dto';
import { getModuleLogger } from '../../common/logging/module-logger';

const logger = getModuleLogger('TransfersService');

function asNumber(v: Prisma.Decimal | number): number {
  return typeof v === 'number' ? v : Number(v.toString());
}

@Injectable()
export class TransfersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, userId: string, dto: CreateTransferDto) {
    if (!dto.lines?.length) {
      throw new BadRequestException('lines is required');
    }
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException(
        'fromWarehouseId and toWarehouseId must be different',
      );
    }

    const [fromWh, toWh] = await Promise.all([
      this.prisma.warehouse.findFirst({
        where: { id: dto.fromWarehouseId, companyId },
        select: { id: true, type: true },
      }),
      this.prisma.warehouse.findFirst({
        where: { id: dto.toWarehouseId, companyId },
        select: { id: true, type: true },
      }),
    ]);
    if (!fromWh) throw new NotFoundException('From warehouse not found');
    if (!toWh) throw new NotFoundException('To warehouse not found');

    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.create({
        data: {
          companyId,
          fromWarehouseId: dto.fromWarehouseId,
          toWarehouseId: dto.toWarehouseId,
          status: TransferStatus.PENDING,
          memo: dto.memo?.trim() || null,
          requestedByUserId: userId,
          lines: {
            create: dto.lines.map((l) => ({
              lotId: l.lotId,
              qty: l.qty,
            })),
          },
        },
        include: {
          fromWarehouse: { select: { id: true, name: true, type: true } },
          toWarehouse: { select: { id: true, name: true, type: true } },
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

      logger.info({
        event: 'transfer.created',
        companyId,
        transferId: transfer.id,
        fromWarehouseId: dto.fromWarehouseId,
        toWarehouseId: dto.toWarehouseId,
        lineCount: dto.lines.length,
      });

      return this.toResponse(transfer);
    });
  }

  async list(
    companyId: string,
    query: ListTransfersQueryDto,
    branchIds?: string[] | null,
  ) {
    const { status, fromWarehouseId, toWarehouseId, page = 1, pageSize = 20 } =
      query;
    const skip = (Math.max(1, page) - 1) * Math.min(50, Math.max(1, pageSize));
    const take = Math.min(50, Math.max(1, pageSize));

    const where: Prisma.TransferWhereInput = { companyId };
    if (status) where.status = status;
    if (fromWarehouseId) where.fromWarehouseId = fromWarehouseId;
    if (toWarehouseId) where.toWarehouseId = toWarehouseId;
    if (branchIds?.length) {
      where.AND = [
        { fromWarehouse: { branchId: { in: branchIds } } },
        { toWarehouse: { branchId: { in: branchIds } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.transfer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          fromWarehouse: { select: { id: true, name: true, type: true } },
          toWarehouse: { select: { id: true, name: true, type: true } },
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
      }),
      this.prisma.transfer.count({ where }),
    ]);

    return {
      items: items.map((t) => this.toResponse(t)),
      total,
      page: Math.max(1, page),
      pageSize: take,
      totalPages: Math.ceil(total / take),
    };
  }

  async getOne(companyId: string, id: string, branchIds?: string[] | null) {
    const where: Prisma.TransferWhereInput = { id, companyId };
    if (branchIds?.length) {
      where.AND = [
        { fromWarehouse: { branchId: { in: branchIds } } },
        { toWarehouse: { branchId: { in: branchIds } } },
      ];
    }
    const transfer = await this.prisma.transfer.findFirst({
      where,
      include: {
        fromWarehouse: { select: { id: true, name: true, type: true } },
        toWarehouse: { select: { id: true, name: true, type: true } },
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
    if (!transfer) throw new NotFoundException('Transfer not found');
    return this.toResponse(transfer);
  }

  async confirm(companyId: string, userId: string, id: string) {
    const transfer = await this.prisma.transfer.findFirst({
      where: { id, companyId },
      include: { lines: true },
    });
    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.status !== TransferStatus.PENDING) {
      throw new BadRequestException('Transfer is not pending');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const line of transfer.lines) {
        const stock = await tx.stock.findFirst({
          where: {
            companyId,
            warehouseId: transfer.fromWarehouseId,
            lotId: line.lotId,
          },
          select: { id: true, onHand: true, reserved: true },
        });
        if (!stock) {
          throw new BadRequestException(
            `Stock not found for lot ${line.lotId} in from warehouse`,
          );
        }
        const onHand = asNumber(stock.onHand);
        const reserved = asNumber(stock.reserved);
        const available = onHand - reserved;
        const qty = asNumber(line.qty);
        if (qty <= 0) {
          throw new BadRequestException(`Invalid qty for lot ${line.lotId}`);
        }
        if (available < qty) {
          throw new BadRequestException(
            `Insufficient stock for lot ${line.lotId}: available ${available}, requested ${qty}`,
          );
        }
      }

      const inventoryTx = await tx.inventoryTx.create({
        data: {
          companyId,
          type: InventoryTxType.TRANSFER,
          actorUserId: userId,
          refType: 'Transfer',
          refId: transfer.id,
          memo: transfer.memo || '창고 간 재고 이동 확정',
        },
      });

      for (const line of transfer.lines) {
        const qty = new Prisma.Decimal(line.qty.toString());
        await tx.inventoryTxLine.createMany({
          data: [
            {
              txId: inventoryTx.id,
              warehouseId: transfer.fromWarehouseId,
              lotId: line.lotId,
              qtyDelta: qty.negated(),
            },
            {
              txId: inventoryTx.id,
              warehouseId: transfer.toWarehouseId,
              lotId: line.lotId,
              qtyDelta: qty,
            },
          ],
        });

        await tx.stock.updateMany({
          where: {
            companyId,
            warehouseId: transfer.fromWarehouseId,
            lotId: line.lotId,
          },
          data: { onHand: { decrement: line.qty } },
        });

        const toStock = await tx.stock.findFirst({
          where: {
            companyId,
            warehouseId: transfer.toWarehouseId,
            lotId: line.lotId,
          },
        });
        if (toStock) {
          await tx.stock.update({
            where: { id: toStock.id },
            data: { onHand: { increment: line.qty } },
          });
        } else {
          await tx.stock.create({
            data: {
              companyId,
              warehouseId: transfer.toWarehouseId,
              lotId: line.lotId,
              onHand: line.qty,
              reserved: 0,
            },
          });
        }
      }

      await tx.transfer.update({
        where: { id },
        data: {
          status: TransferStatus.CONFIRMED,
          confirmedByUserId: userId,
          confirmedAt: new Date(),
        },
      });

      logger.info({
        event: 'transfer.confirmed',
        companyId,
        transferId: transfer.id,
        actorUserId: userId,
      });
    });

    return this.getOne(companyId, id);
  }

  async cancel(companyId: string, id: string) {
    const transfer = await this.prisma.transfer.findFirst({
      where: { id, companyId },
    });
    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.status !== TransferStatus.PENDING) {
      throw new BadRequestException('Only pending transfers can be cancelled');
    }

    await this.prisma.transfer.update({
      where: { id },
      data: { status: TransferStatus.CANCELLED },
    });

    return this.getOne(companyId, id);
  }

  private toResponse(transfer: {
    id: string;
    status: TransferStatus;
    memo: string | null;
    createdAt: Date;
    fromWarehouse: { id: string; name: string; type: string };
    toWarehouse: { id: string; name: string; type: string };
    lines: Array<{
      id: string;
      lotId: string;
      qty: Prisma.Decimal;
      lot: {
        id: string;
        expiryDate: Date | null;
        item: { itemCode: string; itemName: string };
      };
    }>;
    confirmedAt: Date | null;
  }) {
    return {
      id: transfer.id,
      status: transfer.status,
      memo: transfer.memo,
      fromWarehouse: transfer.fromWarehouse,
      toWarehouse: transfer.toWarehouse,
      lines: transfer.lines.map((l) => ({
        id: l.id,
        lotId: l.lotId,
        qty: asNumber(l.qty),
        lot: l.lot,
      })),
      createdAt: transfer.createdAt.toISOString(),
      confirmedAt: transfer.confirmedAt?.toISOString() ?? null,
    };
  }
}
