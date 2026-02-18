import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OutboundStatus, PickSource, Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

type ReserveOptions = {
  allowStatuses?: OutboundStatus[];
  forceReReserve?: boolean; // 주문 전체 재예약(가급적 사용 X)
};

@Injectable()
export class OutboundPickingService {
  constructor(private readonly prisma: PrismaService) {}

  // -----------------------------
  // Public APIs
  // -----------------------------

  async reserveForOrder(companyId: string, userId: string, orderId: string) {
    return this.prisma.$transaction((tx) =>
      this.reserveForOrderTx(tx, companyId, userId, orderId, {
        allowStatuses: [OutboundStatus.DRAFT, OutboundStatus.PICKING],
        forceReReserve: false,
      }),
    );
  }

  async submit(companyId: string, userId: string, orderId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.outboundOrder.findFirst({
        where: { id: orderId, companyId },
        include: { lines: true },
      });
      if (!order) throw new NotFoundException('Order not found');

      if (order.status !== OutboundStatus.PICKING) {
        throw new BadRequestException('Only PICKING orders can be submitted');
      }

      const allocations = await tx.pickAllocation.findMany({
        where: {
          companyId,
          outboundLine: { orderId },
          isReleased: false,
          isCommitted: false,
        },
      });

      if (allocations.length === 0) {
        throw new BadRequestException('No picked allocations found');
      }

      // lineId별 합계
      const sumByLine = new Map<string, number>();
      for (const a of allocations) {
        sumByLine.set(
          a.outboundLineId,
          (sumByLine.get(a.outboundLineId) ?? 0) + a.qty,
        );
      }

      for (const line of order.lines) {
        if (line.status === 'CANCELLED') continue;

        const picked = sumByLine.get(line.id) ?? 0;

        if (picked > line.requestedQty) {
          throw new BadRequestException(
            'Picked quantity exceeds requested quantity',
          );
        }

        await tx.outboundLine.update({
          where: { id: line.id },
          data: { pickedQty: picked },
        });
      }

      await tx.outboundOrder.update({
        where: { id: orderId },
        data: { status: OutboundStatus.PICKED },
      });

      return { message: 'Picked submitted' };
    });
  }

  async manualPick(
    companyId: string,
    userId: string,
    orderId: string,
    dto: {
      outboundLineId: string;
      warehouseId: string;
      lotId: string;
      qty: number;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.outboundOrder.findFirst({
        where: { id: orderId, companyId },
        include: { lines: true },
      });
      if (!order) throw new NotFoundException('Order not found');

      const allowed: OutboundStatus[] = [
        OutboundStatus.PICKING,
        OutboundStatus.PICKED,
        OutboundStatus.READY_TO_SHIP,
      ];
      if (!allowed.includes(order.status)) {
        throw new BadRequestException('Order is not pickable');
      }

      const line = order.lines.find((l) => l.id === dto.outboundLineId);
      if (!line) throw new NotFoundException('Line not found');
      if (line.status === 'CANCELLED') {
        throw new BadRequestException('Cancelled line');
      }

      if (dto.qty <= 0) throw new BadRequestException('qty must be positive');

      const stock = await tx.stock.findFirst({
        where: {
          companyId,
          warehouseId: dto.warehouseId,
          lotId: dto.lotId,
          lot: { itemId: line.itemId },
        },
      });
      if (!stock) throw new NotFoundException('Stock not found');

      const available = stock.onHand - stock.reserved;
      if (available < dto.qty) {
        throw new BadRequestException('Insufficient available stock');
      }

      await tx.stock.update({
        where: { id: stock.id },
        data: { reserved: { increment: dto.qty } },
      });

      await tx.pickAllocation.create({
        data: {
          companyId,
          outboundLineId: line.id,
          warehouseId: dto.warehouseId,
          lotId: dto.lotId,
          qty: dto.qty,
          source: PickSource.MANUAL,
        },
      });

      // 수동 픽이 들어오면 PICKING으로 유지(READY_TO_SHIP/PICKED면 재검수 필요)
      if (order.status !== OutboundStatus.PICKING) {
        await tx.outboundOrder.update({
          where: { id: orderId },
          data: {
            status: OutboundStatus.PICKING,
            confirmedAt: null,
            confirmedByUserId: null,
          },
        });
      }

      return { message: 'Manual pick reserved' };
    });
  }

  // -----------------------------
  // Tx helpers (OrdersService에서 같이 쓰도록 공개)
  // -----------------------------

  async reserveForOrderTx(
    tx: Tx,
    companyId: string,
    userId: string,
    orderId: string,
    opts: ReserveOptions = {},
  ) {
    const allow = opts.allowStatuses ?? [
      OutboundStatus.DRAFT,
      OutboundStatus.PICKING,
    ];

    const order = await tx.outboundOrder.findFirst({
      where: { id: orderId, companyId },
      include: { lines: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (!allow.includes(order.status)) {
      throw new BadRequestException('Order is not reservable');
    }

    const existingCount = await tx.pickAllocation.count({
      where: {
        companyId,
        outboundLine: { orderId },
        isReleased: false,
        isCommitted: false,
      },
    });

    if (existingCount > 0) {
      if (!opts.forceReReserve) {
        throw new BadRequestException('Already reserved');
      }
      await this.releaseAllForOrderTx(tx, companyId, orderId);
    }

    for (const line of order.lines) {
      if (line.status === 'CANCELLED') continue;
      if (line.requestedQty <= 0) continue;

      await this.reserveAdditionalForLineTx(
        tx,
        companyId,
        orderId,
        line.id,
        line.itemId,
        line.requestedQty,
      );
    }

    await tx.outboundOrder.update({
      where: { id: orderId },
      data: { status: OutboundStatus.PICKING },
    });

    return { message: 'Reserved (FEFO)', orderId };
  }

  // 라인 단위: 추가 reserve (FEFO)
  async reserveAdditionalForLineTx(
    tx: Tx,
    companyId: string,
    orderId: string,
    outboundLineId: string,
    itemId: string,
    addQty: number,
  ) {
    if (addQty <= 0) return;

    // FEFO: expiryDate 있는 lot 먼저, 그 다음 expiry null
    const stocksWithExpiry = await tx.stock.findMany({
      where: {
        companyId,
        onHand: { gt: 0 },
        lot: { itemId, expiryDate: { not: null } },
      },
      orderBy: [{ lot: { expiryDate: 'asc' } }, { warehouse: { type: 'asc' } }],
    });

    const stocksNoExpiry = await tx.stock.findMany({
      where: {
        companyId,
        onHand: { gt: 0 },
        lot: { itemId, expiryDate: null },
      },
      orderBy: [{ warehouse: { type: 'asc' } }, { lot: { createdAt: 'asc' } }],
    });

    const candidates = [...stocksWithExpiry, ...stocksNoExpiry];

    let remaining = addQty;

    for (const s of candidates) {
      if (remaining <= 0) break;

      const available = s.onHand - s.reserved;
      if (available <= 0) continue;

      const take = Math.min(remaining, available);

      await tx.stock.update({
        where: { id: s.id },
        data: { reserved: { increment: take } },
      });

      await tx.pickAllocation.create({
        data: {
          companyId,
          outboundLineId,
          warehouseId: s.warehouseId,
          lotId: s.lotId,
          qty: take,
          source: PickSource.AUTO_FEFO,
        },
      });

      remaining -= take;
    }

    if (remaining > 0) {
      throw new BadRequestException('Insufficient stock to reserve');
    }
  }

  // 라인 단위: qty만큼 release (LIFO)
  async releaseQtyForLineTx(
    tx: Tx,
    companyId: string,
    outboundLineId: string,
    qtyToRelease: number,
  ) {
    if (qtyToRelease <= 0) return;

    let remaining = qtyToRelease;

    const allocations = await tx.pickAllocation.findMany({
      where: {
        companyId,
        outboundLineId,
        isReleased: false,
        isCommitted: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    for (const alloc of allocations) {
      if (remaining <= 0) break;

      const releaseQty = Math.min(alloc.qty, remaining);

      await tx.stock.update({
        where: {
          companyId_warehouseId_lotId: {
            companyId,
            warehouseId: alloc.warehouseId,
            lotId: alloc.lotId,
          },
        },
        data: { reserved: { decrement: releaseQty } },
      });

      if (releaseQty === alloc.qty) {
        await tx.pickAllocation.update({
          where: { id: alloc.id },
          data: { isReleased: true, releasedAt: new Date() },
        });
      } else {
        await tx.pickAllocation.update({
          where: { id: alloc.id },
          data: { qty: alloc.qty - releaseQty },
        });
      }

      remaining -= releaseQty;
    }

    if (remaining > 0) {
      // 이 케이스는 원래 발생하면 안 됨(데이터 불일치)
      throw new BadRequestException('Not enough reserved qty to release');
    }
  }

  async releaseAllForOrderTx(tx: Tx, companyId: string, orderId: string) {
    const allocations = await tx.pickAllocation.findMany({
      where: {
        companyId,
        outboundLine: { orderId },
        isReleased: false,
        isCommitted: false,
      },
    });

    for (const alloc of allocations) {
      await tx.stock.update({
        where: {
          companyId_warehouseId_lotId: {
            companyId,
            warehouseId: alloc.warehouseId,
            lotId: alloc.lotId,
          },
        },
        data: { reserved: { decrement: alloc.qty } },
      });

      await tx.pickAllocation.update({
        where: { id: alloc.id },
        data: { isReleased: true, releasedAt: new Date() },
      });
    }

    return { released: allocations.length };
  }
}
