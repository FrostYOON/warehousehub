import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OutboundStatus, PickSource, Prisma } from '@prisma/client';
import { getModuleLogger } from '../../common/logging/module-logger';

type Tx = Prisma.TransactionClient;

type ReserveOptions = {
  allowStatuses?: OutboundStatus[];
  forceReReserve?: boolean; // 주문 전체 재예약(가급적 사용 X)
};

const logger = getModuleLogger('OutboundPickingService');

function asNumber(value: Prisma.Decimal | number): number {
  return typeof value === 'number' ? value : value.toNumber();
}

// NOTE(version policy)
// - OutboundOrder.version / OutboundLine.version 증가는 “사용자 편집(OrdersService)”에서만 수행한다.
// - PickingService의 auto-reserve, submit 동기화, 수동픽 예약 등 내부 상태/수량 동기화는 version을 올리지 않는다.
//   (version이 과도하게 증가해 UI/동시성 제어가 어려워지는 것을 방지)

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
        // pickedQty는 "실제 픽 체크 수량"이다.
        // 다만 아직 pickedQty 갱신 경로가 없는 allocation은 qty를 fallback으로 사용해
        // submit 시 0으로 떨어지는 비정상 케이스를 방지한다.
        const pickedQty = asNumber(a.pickedQty);
        const reservedQty = asNumber(a.qty);
        const picked = pickedQty > 0 ? pickedQty : reservedQty;
        sumByLine.set(
          a.outboundLineId,
          (sumByLine.get(a.outboundLineId) ?? 0) + picked,
        );
      }

      for (const line of order.lines) {
        if (line.status === 'CANCELLED') continue;

        const picked = sumByLine.get(line.id) ?? 0;

        // ✅ 정책: 부분 픽은 허용(입고 후 추가 픽 가능)
        // ❌ 초과 픽은 금지: 더 필요하면 오더 requestedQty를 먼저 늘리고 reserve/pick 진행
        if (picked > asNumber(line.requestedQty)) {
          throw new BadRequestException(
            `Picked quantity exceeds requested quantity (lineId=${line.id})`,
          );
        }

        await tx.outboundLine.update({
          where: { id: line.id },
          data: {
            pickedQty: picked,
          },
        });
      }

      await tx.outboundOrder.update({
        where: { id: orderId },
        data: {
          status: OutboundStatus.PICKED,
          // ✅ 픽 완료 제출 기록
          pickedSubmittedAt: new Date(),
          pickedSubmittedByUserId: userId,

          // ✅ PICKED로 되돌아가면 검수/배송 메타는 무효
          verifiedAt: null,
          verifiedByUserId: null,
          shippingStartedAt: null,
          shippingStartedByUserId: null,
          deliveredAt: null,
          deliveredByUserId: null,
        },
      });

      logger.info({
        event: 'outbound.picking.submit.success',
        companyId,
        orderId,
        userId,
        allocationCount: allocations.length,
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

      const available = asNumber(stock.onHand) - asNumber(stock.reserved);
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

      // 수동 픽이 들어오면 PICKING으로 롤백(READY_TO_SHIP/PICKED면 재검수/재출발 준비 필요)
      // ✅ 정책: pickedQty는 submit 시점에 '현재 allocation 합계'로 동기화하므로 여기서는 0으로 초기화
      if (order.status !== OutboundStatus.PICKING) {
        await tx.outboundLine.updateMany({
          where: { orderId, status: 'ACTIVE' },
          data: { pickedQty: 0 },
        });
      }

      // ✅ 오더 메타데이터 초기화 + 버전 증가
      await tx.outboundOrder.update({
        where: { id: orderId },
        data: {
          status: OutboundStatus.PICKING,
          verifiedAt: null,
          verifiedByUserId: null,
          shippingStartedAt: null,
          shippingStartedByUserId: null,
          deliveredAt: null,
          deliveredByUserId: null,
        },
      });

      // ✅ 해당 라인도 변경 이력(버전) 반영
      // (Removed version increment update as per instructions)

      logger.info({
        event: 'outbound.picking.manual.success',
        companyId,
        orderId,
        userId,
        outboundLineId: dto.outboundLineId,
        qty: dto.qty,
      });

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

    const shortages: Array<{
      outboundLineId: string;
      itemId: string;
      shortage: number;
    }> = [];

    for (const line of order.lines) {
      if (line.status === 'CANCELLED') continue;
      if (line.requestedQty <= 0) continue;

      const { shortage } = await this.reserveAdditionalForLineTx(
        tx,
        companyId,
        orderId,
        line.id,
        line.itemId,
        line.requestedQty,
      );

      if (shortage > 0) {
        shortages.push({
          outboundLineId: line.id,
          itemId: line.itemId,
          shortage,
        });
      }
    }

    await tx.outboundOrder.update({
      where: { id: orderId },
      data: {
        status: OutboundStatus.PICKING,
        verifiedAt: null,
        verifiedByUserId: null,
        shippingStartedAt: null,
        shippingStartedByUserId: null,
        deliveredAt: null,
        deliveredByUserId: null,
      },
    });

    return {
      message: shortages.length
        ? 'Reserved (FEFO - partial)'
        : 'Reserved (FEFO)',
      orderId,
      shortages,
    };
  }

  // 라인 단위: 추가 reserve (FEFO)
  async reserveAdditionalForLineTx(
    tx: Tx,
    companyId: string,
    orderId: string,
    outboundLineId: string,
    itemId: string,
    addQty: number,
  ): Promise<{ reserved: number; shortage: number }> {
    if (addQty <= 0) return { reserved: 0, shortage: 0 };

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

      const available = asNumber(s.onHand) - asNumber(s.reserved);
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

    // ✅ 정책: 재고 부족이어도 '가능한 만큼'만 예약하고 부족분은 남긴다.
    // (입고 이후 추가 픽/추가 예약 가능)
    const reserved = addQty - remaining;
    return { reserved, shortage: remaining };
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

      const allocQty = asNumber(alloc.qty);
      const releaseQty = Math.min(allocQty, remaining);

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

      if (releaseQty === allocQty) {
        await tx.pickAllocation.update({
          where: { id: alloc.id },
          data: { isReleased: true, releasedAt: new Date() },
        });
      } else {
        await tx.pickAllocation.update({
          where: { id: alloc.id },
          data: { qty: allocQty - releaseQty },
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
        data: { reserved: { decrement: asNumber(alloc.qty) } },
      });

      await tx.pickAllocation.update({
        where: { id: alloc.id },
        data: { isReleased: true, releasedAt: new Date() },
      });
    }

    return { released: allocations.length };
  }
}
