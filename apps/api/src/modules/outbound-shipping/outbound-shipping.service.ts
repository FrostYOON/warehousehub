import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryTxType, OutboundStatus } from '@prisma/client';

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
        // 추후 verifiedBy/verifiedAt 컬럼 생기면 여기 추가
      },
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
        // 추후 shippedBy/shippedAt 컬럼 생기면 여기 추가
      },
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
          outboundLine: { orderId },
          isReleased: false,
          isCommitted: false,
        },
      });

      if (allocations.length === 0) {
        throw new BadRequestException('No picked allocations found');
      }

      // 1) 재고 커밋: reserved 감소 + onHand 감소
      for (const alloc of allocations) {
        await tx.stock.update({
          where: {
            companyId_warehouseId_lotId: {
              companyId,
              warehouseId: alloc.warehouseId,
              lotId: alloc.lotId,
            },
          },
          data: {
            reserved: { decrement: alloc.qty },
            onHand: { decrement: alloc.qty },
          },
        });

        await tx.pickAllocation.update({
          where: { id: alloc.id },
          data: { isCommitted: true, committedAt: new Date() },
        });
      }

      // 2) shippedQty 업데이트(완료 시점 기준)
      for (const line of order.lines) {
        if (line.status === 'CANCELLED') continue;

        // shippedQty는 "완료로 커밋된 수량" 의미로 운용
        await tx.outboundLine.update({
          where: { id: line.id },
          data: { shippedQty: line.pickedQty },
        });
      }

      // 3) 주문 상태 DELIVERED
      await tx.outboundOrder.update({
        where: { id: orderId },
        data: {
          status: OutboundStatus.DELIVERED,
          // 지금은 기존 필드를 재사용. 나중에 deliveredBy/deliveredAt로 분리 추천
          confirmedByUserId: userId,
          confirmedAt: new Date(),
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

      return { message: 'Delivered (stock committed)' };
    });
  }
}
