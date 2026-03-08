import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import ExcelJS from 'exceljs';
import { getModuleLogger } from '../../common/logging/module-logger';

const logger = getModuleLogger('TraceabilityService');

function asNumber(v: Prisma.Decimal | number): number {
  return typeof v === 'number' ? v : Number(v.toString());
}

@Injectable()
export class TraceabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getLotHistory(companyId: string, lotId: string) {
    const lot = await this.prisma.lot.findFirst({
      where: { id: lotId, companyId },
      select: {
        id: true,
        expiryDate: true,
        createdAt: true,
        item: {
          select: {
            id: true,
            itemCode: true,
            itemName: true,
          },
        },
      },
    });
    if (!lot) throw new NotFoundException('Lot not found');

    const [inventoryTxLines, pickAllocations, transferLines, stocks] = await Promise.all([
      this.prisma.inventoryTxLine.findMany({
        where: { lotId },
        include: {
          tx: {
            select: {
              id: true,
              type: true,
              createdAt: true,
              refType: true,
              refId: true,
              memo: true,
              actorUser: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          warehouse: {
            select: { id: true, name: true, type: true, region: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.pickAllocation.findMany({
        where: { lotId, companyId },
        include: {
          warehouse: {
            select: { id: true, name: true, type: true, region: true },
          },
          outboundLine: {
            select: {
              id: true,
              requestedQty: true,
              pickedQty: true,
              shippedQty: true,
              order: {
                select: {
                  id: true,
                  orderNo: true,
                  status: true,
                  plannedDate: true,
                  customer: {
                    select: { customerName: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.transferLine.findMany({
        where: { lotId },
        include: {
          transfer: {
            select: {
              id: true,
              status: true,
              createdAt: true,
              confirmedAt: true,
              fromWarehouse: {
                select: { id: true, name: true, type: true, region: true },
              },
              toWarehouse: {
                select: { id: true, name: true, type: true, region: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stock.findMany({
        where: { lotId, companyId },
        include: {
          warehouse: {
            select: { id: true, name: true, type: true, region: true },
          },
        },
        orderBy: { warehouse: { name: 'asc' } },
      }),
    ]);

    const inventoryHistory = inventoryTxLines.map((line) => ({
      id: line.id,
      type: line.tx.type,
      createdAt: line.tx.createdAt.toISOString(),
      qtyDelta: asNumber(line.qtyDelta),
      warehouse: line.warehouse,
      refType: line.tx.refType,
      refId: line.tx.refId,
      memo: line.tx.memo,
      actorUser: line.tx.actorUser,
    }));

    const pickHistory = pickAllocations.map((pa) => ({
      id: pa.id,
      createdAt: pa.createdAt.toISOString(),
      qty: asNumber(pa.qty),
      pickedQty: asNumber(pa.pickedQty),
      warehouse: pa.warehouse,
      isReleased: pa.isReleased,
      isCommitted: pa.isCommitted,
      orderNo: pa.outboundLine.order.orderNo,
      orderId: pa.outboundLine.order.id,
      orderStatus: pa.outboundLine.order.status,
      customerName: pa.outboundLine.order.customer.customerName,
    }));

    const transferHistory = transferLines.map((tl) => ({
      id: tl.id,
      transferId: tl.transfer.id,
      createdAt: tl.transfer.createdAt.toISOString(),
      confirmedAt: tl.transfer.confirmedAt?.toISOString() ?? null,
      qty: asNumber(tl.qty),
      status: tl.transfer.status,
      fromWarehouse: tl.transfer.fromWarehouse,
      toWarehouse: tl.transfer.toWarehouse,
    }));

    const stockSummary = stocks.map((s) => ({
      warehouseId: s.warehouseId,
      warehouse: s.warehouse,
      onHand: asNumber(s.onHand),
      reserved: asNumber(s.reserved),
      available: asNumber(s.onHand) - asNumber(s.reserved),
    }));

    return {
      lot: {
        id: lot.id,
        itemCode: lot.item.itemCode,
        itemName: lot.item.itemName,
        expiryDate: lot.expiryDate?.toISOString().slice(0, 10) ?? null,
        createdAt: lot.createdAt.toISOString(),
      },
      stockSummary,
      inventoryHistory,
      pickHistory,
      transferHistory,
    };
  }

  async exportLotHistory(companyId: string, lotId: string): Promise<Buffer> {
    const data = await this.getLotHistory(companyId, lotId);
    const workbook = new ExcelJS.Workbook();

    const invRows = data.inventoryHistory.map((h) => ({
      구분: '재고변동',
      유형: h.type,
      일시: h.createdAt,
      수량변동: h.qtyDelta,
      창고: h.warehouse.name,
      참조: h.refType && h.refId ? `${h.refType}:${h.refId}` : '',
      메모: h.memo ?? '',
    }));
    const pickRows = data.pickHistory.map((h) => ({
      구분: '픽예약',
      출고번호: h.orderNo,
      고객사: h.customerName,
      일시: h.createdAt,
      예약수량: h.qty,
      픽수량: h.pickedQty,
      창고: h.warehouse.name,
    }));
    const transferRows = data.transferHistory.map((h) => ({
      구분: '창고이동',
      일시: h.createdAt,
      수량: h.qty,
      출발창고: h.fromWarehouse.name,
      도착창고: h.toWarehouse.name,
      상태: h.status,
    }));

    const allRows = [...invRows, ...pickRows, ...transferRows];
    const columns = allRows.length > 0 ? Object.keys(allRows[0]) : ['구분', '일시'];
    const ws = workbook.addWorksheet('Lot이력');
    ws.columns = columns.map((k) => ({ header: k, key: k, width: 14 }));
    ws.addRows(allRows);

    const buf = await workbook.xlsx.writeBuffer();
    return Buffer.from(buf);
  }
}
