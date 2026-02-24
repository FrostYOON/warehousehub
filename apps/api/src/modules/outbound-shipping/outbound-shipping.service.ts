import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryTxType, OutboundStatus } from '@prisma/client';
import { getModuleLogger } from '../../common/logging/module-logger';

const logger = getModuleLogger('OutboundShippingService');

@Injectable()
export class OutboundShippingService {
  constructor(private readonly prisma: PrismaService) {}

  // 픽 검수 완료: PICKED -> READY_TO_SHIP
  async verify(companyId: string, userId: string, orderId: string) {
    const order = await this.prisma.outboundOrder.findFirst({
      where: { id: orderId, companyId },
      select: { id: true, status: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (order.status !== OutboundStatus.PICKED) {
      throw new BadRequestException('Only PICKED orders can be verified');
    }

    await this.prisma.outboundOrder.update({
      where: { id: orderId },
      data: {
        status: OutboundStatus.READY_TO_SHIP,
        verifiedByUserId: userId,
        verifiedAt: new Date(),
      },
    });

    logger.info({
      event: 'outbound.shipping.verify.success',
      companyId,
      orderId,
      userId,
    });

    return { message: 'Verified' };
  }

  // 배송 시작: READY_TO_SHIP -> SHIPPING
  async start(companyId: string, userId: string, orderId: string) {
    const order = await this.prisma.outboundOrder.findFirst({
      where: { id: orderId, companyId },
      select: { id: true, status: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (order.status !== OutboundStatus.READY_TO_SHIP) {
      throw new BadRequestException(
        'Only READY_TO_SHIP orders can start shipping',
      );
    }

    await this.prisma.outboundOrder.update({
      where: { id: orderId },
      data: {
        status: OutboundStatus.SHIPPING,
        shippingStartedByUserId: userId,
        shippingStartedAt: new Date(),
      },
    });

    logger.info({
      event: 'outbound.shipping.start.success',
      companyId,
      orderId,
      userId,
    });

    return { message: 'Shipping started' };
  }

  // 배송 완료(출고 완료): SHIPPING -> DELIVERED + onHand 차감(커밋)
  async complete(companyId: string, userId: string, orderId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.outboundOrder.findFirst({
        where: { id: orderId, companyId },
        include: { lines: true },
      });
      if (!order) throw new NotFoundException('Order not found');

      if (order.status !== OutboundStatus.SHIPPING) {
        throw new BadRequestException('Only SHIPPING orders can be completed');
      }

      // 배송 완료 시점에 커밋할 allocation들
      const allocations = await tx.pickAllocation.findMany({
        where: {
          companyId,
          outboundLine: { orderId, status: 'ACTIVE' },
          isReleased: false,
          isCommitted: false,
        },
      });

      if (allocations.length === 0) {
        throw new BadRequestException('No picked allocations found');
      }

      // 1) 재고 커밋: reserved 감소 + onHand 감소
      for (const alloc of allocations) {
        const committedQty = alloc.pickedQty > 0 ? alloc.pickedQty : alloc.qty;
        if (committedQty > alloc.qty) {
          throw new BadRequestException(
            `Picked quantity exceeds reserved quantity (allocationId=${alloc.id})`,
          );
        }

        await tx.stock.update({
          where: {
            companyId_warehouseId_lotId: {
              companyId,
              warehouseId: alloc.warehouseId,
              lotId: alloc.lotId,
            },
          },
          data: {
            // 배송 완료 시점에 미픽 물량은 예약 해제되고,
            // 실제 픽 물량만 onHand에서 차감된다.
            reserved: { decrement: alloc.qty },
            onHand: { decrement: committedQty },
          },
        });

        await tx.pickAllocation.update({
          where: { id: alloc.id },
          data: { isCommitted: true, committedAt: new Date() },
        });
      }

      // 2) shippedQty 업데이트(완료 시점 기준)
      // 커밋된 allocation 수량(=이번 complete에서 처리한 allocations)의 라인별 합계를 shippedQty로 기록
      const shippedByLineId = new Map<string, number>();
      for (const a of allocations) {
        const committedQty = a.pickedQty > 0 ? a.pickedQty : a.qty;
        shippedByLineId.set(
          a.outboundLineId,
          (shippedByLineId.get(a.outboundLineId) ?? 0) + committedQty,
        );
      }

      for (const line of order.lines) {
        if (line.status === 'CANCELLED') continue;

        const shipped = shippedByLineId.get(line.id) ?? 0;
        // shippedQty는 "출고 완료로 커밋된 수량" 의미로 운용
        await tx.outboundLine.update({
          where: { id: line.id },
          data: { shippedQty: shipped },
        });
      }

      // 3) 주문 상태 DELIVERED
      await tx.outboundOrder.update({
        where: { id: orderId },
        data: {
          status: OutboundStatus.DELIVERED,
          deliveredByUserId: userId,
          deliveredAt: new Date(),
        },
      });

      // 4) Tx 로그
      await tx.inventoryTx.create({
        data: {
          companyId,
          type: InventoryTxType.OUTBOUND_CONFIRM, // 나중에 OUTBOUND_COMPLETE로 이름 바꾸면 더 명확
          actorUserId: userId,
          refType: 'OUTBOUND_ORDER',
          refId: orderId,
        },
      });

      logger.info({
        event: 'outbound.shipping.complete.success',
        companyId,
        orderId,
        userId,
        allocationCount: allocations.length,
      });

      return { message: 'Delivered (stock committed)' };
    });
  }
}
