import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOutboundOrderDto } from './dto/create-outbound-order.dto';
import { OutboundPickingService } from '../outbound-picking/outbound-picking.service';
import { OutboundStatus, Prisma } from '@prisma/client';
import { getModuleLogger } from '../../common/logging/module-logger';

type Tx = Prisma.TransactionClient;

const FINAL_STATUSES: OutboundStatus[] = [
  OutboundStatus.SHIPPING,
  OutboundStatus.DELIVERED,
  OutboundStatus.CANCELLED,
];

// READY_TO_SHIP까지는 “편집 가능”
// 단, PICKED/READY_TO_SHIP 상태에서 편집이 발생하면:
// - 상태를 PICKING으로 롤백
// - 검수/배송 메타데이터 초기화
// - pickedQty는 submit에서 재계산되므로 0으로 리셋
const EDITABLE_UNTIL_READY: OutboundStatus[] = [
  OutboundStatus.DRAFT,
  OutboundStatus.PICKING,
  OutboundStatus.PICKED,
  OutboundStatus.READY_TO_SHIP,
];

const logger = getModuleLogger('OutboundOrdersService');

function asNumber(value: Prisma.Decimal | number): number {
  return typeof value === 'number' ? value : value.toNumber();
}

@Injectable()
export class OutboundOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly picking: OutboundPickingService,
  ) {}

  // -----------------------------
  // Create / Read
  // -----------------------------

  async create(companyId: string, userId: string, dto: CreateOutboundOrderDto) {
    if (!dto.lines?.length) {
      throw new BadRequestException('lines is required');
    }

    return this.prisma.$transaction(async (tx) => {
      await this.ensureItemsBelongToCompanyTx(
        tx,
        companyId,
        dto.lines.map((line) => line.itemId),
      );

      const customer = await tx.customer.findFirst({
        where: { id: dto.customerId, companyId },
      });
      if (!customer) throw new NotFoundException('Customer not found');

      const order = await tx.outboundOrder.create({
        data: {
          companyId,
          customerId: dto.customerId,
          plannedDate: new Date(dto.plannedDate),
          memo: dto.memo,
          createdByUserId: userId,
          status: OutboundStatus.DRAFT,
          lines: {
            create: dto.lines.map((l) => ({
              itemId: l.itemId,
              requestedQty: l.requestedQty,
            })),
          },
        },
      });

      // ✅ 생성 즉시 자동 reserve (주문 전체)
      await this.picking.reserveForOrderTx(tx, companyId, userId, order.id, {
        allowStatuses: [OutboundStatus.DRAFT, OutboundStatus.PICKING],
        forceReReserve: false,
      });

      logger.info({
        event: 'outbound.order.create.success',
        companyId,
        orderId: order.id,
        userId,
        lineCount: dto.lines.length,
      });

      return tx.outboundOrder.findFirst({
        where: { id: order.id, companyId },
        include: { customer: true, lines: true },
      });
    });
  }

  list(companyId: string) {
    return this.prisma.outboundOrder.findMany({
      where: { companyId },
      orderBy: { plannedDate: 'asc' },
      include: { customer: true, lines: true },
    });
  }

  detail(companyId: string, id: string) {
    return this.prisma.outboundOrder.findFirst({
      where: { id, companyId },
      include: { customer: true, lines: true },
    });
  }

  // -----------------------------
  // Mutations (Line add/update/cancel)
  // -----------------------------

  async addLine(
    companyId: string,
    userId: string,
    orderId: string,
    itemId: string,
    requestedQty: number,
  ) {
    if (!requestedQty || requestedQty <= 0) {
      throw new BadRequestException('requestedQty must be positive');
    }

    return this.prisma.$transaction(async (tx) => {
      await this.ensureItemsBelongToCompanyTx(tx, companyId, [itemId]);

      const order = await tx.outboundOrder.findFirst({
        where: { id: orderId, companyId },
        select: { id: true, status: true },
      });
      if (!order) throw new NotFoundException('Order not found');

      await this.ensureEditableAndRollbackIfNeededTx(tx, orderId, order.status);

      const line = await tx.outboundLine.create({
        data: {
          orderId,
          itemId,
          requestedQty,
        },
      });

      // 신규 라인 reserve
      await this.picking.reserveAdditionalForLineTx(
        tx,
        companyId,
        orderId,
        line.id,
        itemId,
        requestedQty,
      );

      // 편집 발생 → PICKING 유지
      await tx.outboundOrder.update({
        where: { id: orderId },
        data: { status: OutboundStatus.PICKING, version: { increment: 1 } },
      });

      return { message: 'Line added', lineId: line.id };
    });
  }

  async updateLine(
    companyId: string,
    userId: string,
    orderId: string,
    lineId: string,
    newQty: number,
  ) {
    if (!newQty || newQty <= 0) {
      throw new BadRequestException('newQty must be positive');
    }

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.outboundOrder.findFirst({
        where: { id: orderId, companyId },
        select: { id: true, status: true },
      });
      if (!order) throw new NotFoundException('Order not found');

      await this.ensureEditableAndRollbackIfNeededTx(tx, orderId, order.status);

      const line = await tx.outboundLine.findFirst({
        where: { id: lineId, orderId },
      });
      if (!line) throw new NotFoundException('Line not found');
      if (line.status === 'CANCELLED') {
        throw new BadRequestException('Cannot modify cancelled line');
      }

      const diff = newQty - asNumber(line.requestedQty);

      // 감소: diff<0 → 그만큼 release
      if (diff < 0) {
        await this.picking.releaseQtyForLineTx(
          tx,
          companyId,
          lineId,
          Math.abs(diff),
        );
      }

      // 증가: diff>0 → 그만큼 추가 reserve
      if (diff > 0) {
        await this.picking.reserveAdditionalForLineTx(
          tx,
          companyId,
          orderId,
          lineId,
          line.itemId,
          diff,
        );
      }

      await tx.outboundLine.update({
        where: { id: lineId },
        data: { requestedQty: newQty, version: { increment: 1 } },
      });

      // 편집 발생 → PICKING 유지 + pickedQty는 submit에서 동기화하되,
      // 여기서 즉시 “임시” 재동기화 하고 싶으면 아래 블록 활성화
      // (지금은 정책 단순화를 위해 submit에서만 pickedQty 확정 권장)

      await tx.outboundOrder.update({
        where: { id: orderId },
        data: { status: OutboundStatus.PICKING, version: { increment: 1 } },
      });

      return { message: 'Line updated' };
    });
  }

  async cancelLine(
    companyId: string,
    userId: string,
    orderId: string,
    lineId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.outboundOrder.findFirst({
        where: { id: orderId, companyId },
        select: { id: true, status: true },
      });
      if (!order) throw new NotFoundException('Order not found');

      await this.ensureEditableAndRollbackIfNeededTx(tx, orderId, order.status);

      const line = await tx.outboundLine.findFirst({
        where: { id: lineId, orderId },
      });
      if (!line) throw new NotFoundException('Line not found');

      if (line.status === 'CANCELLED') {
        return { message: 'Already cancelled' };
      }

      // 라인의 미커밋 allocation 전량 release
      const sum = await tx.pickAllocation.aggregate({
        where: {
          companyId,
          outboundLineId: lineId,
          isReleased: false,
          isCommitted: false,
        },
        _sum: { qty: true },
      });
      const reservedQty = sum._sum.qty ? asNumber(sum._sum.qty) : 0;

      if (reservedQty > 0) {
        await this.picking.releaseQtyForLineTx(
          tx,
          companyId,
          lineId,
          reservedQty,
        );
      }

      await tx.outboundLine.update({
        where: { id: lineId },
        data: {
          status: 'CANCELLED',
          pickedQty: 0,
          version: { increment: 1 },
        },
      });

      await tx.outboundOrder.update({
        where: { id: orderId },
        data: { status: OutboundStatus.PICKING, version: { increment: 1 } },
      });

      return { message: 'Line cancelled & released' };
    });
  }

  // -----------------------------
  // Mutations (Order cancel)
  // -----------------------------

  /**
   * 주문 전체 취소
   * - DELIVERED/CANCELLED 는 취소 불가
   * - 그 외 상태에서는: 미커밋 allocation 전부 release + 라인 전부 CANCELLED + 오더 CANCELLED
   *
   * NOTE: 권한(Role) 정책은 Controller/Guard에서 제어.
   */
  async cancelOrder(
    companyId: string,
    userId: string,
    orderId: string,
    reason?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.outboundOrder.findFirst({
        where: { id: orderId, companyId },
        select: {
          id: true,
          status: true,
        },
      });

      if (!order) throw new NotFoundException('Order not found');

      // 배송 완료/이미 취소는 불가
      if (
        order.status === OutboundStatus.DELIVERED ||
        order.status === OutboundStatus.CANCELLED
      ) {
        throw new BadRequestException('Order cannot be cancelled');
      }

      // 출고(배송) 완료 전이면 언제든 라인/오더 취소 가능 정책
      // 1) 미커밋 allocation 전부 release
      await this.picking.releaseAllForOrderTx(tx, companyId, orderId);

      // 2) 라인 전부 CANCELLED 처리
      await tx.outboundLine.updateMany({
        where: { orderId, status: { not: 'CANCELLED' } },
        data: {
          status: 'CANCELLED',
          pickedQty: 0,
          shippedQty: 0,
        },
      });

      // 3) 오더 CANCELLED + 검수/배송 메타데이터 초기화
      await tx.outboundOrder.update({
        where: { id: orderId },
        data: {
          status: OutboundStatus.CANCELLED,

          // 검수/배송 관련 메타데이터 초기화
          pickedSubmittedByUserId: null,
          pickedSubmittedAt: null,
          verifiedByUserId: null,
          verifiedAt: null,
          shippingStartedByUserId: null,
          shippingStartedAt: null,
          deliveredByUserId: null,
          deliveredAt: null,

          memo: reason ? `[CANCELLED] ${reason}` : '[CANCELLED]',
        },
      });

      logger.warn({
        event: 'outbound.order.cancelled',
        companyId,
        orderId,
        userId,
        reason: reason ?? null,
      });

      return { message: 'Order cancelled', orderId };
    });
  }

  // -----------------------------
  // Internal: 정책 강제(편집 시 롤백)
  // -----------------------------

  private async ensureEditableAndRollbackIfNeededTx(
    tx: Tx,
    orderId: string,
    currentStatus: OutboundStatus,
  ) {
    if (FINAL_STATUSES.includes(currentStatus)) {
      throw new BadRequestException('Order is final');
    }

    if (!EDITABLE_UNTIL_READY.includes(currentStatus)) {
      throw new BadRequestException('Order is not editable');
    }

    // ✅ 핵심: PICKED/READY_TO_SHIP에서 편집하면 무조건 PICKING으로 롤백
    // - 검수/배송 단계 메타데이터를 초기화(스키마 기준)
    // - 라인 pickedQty는 submit에서 재계산되므로, 편집 시점에는 0으로 리셋해 “오래된 값”을 방지
    if (
      currentStatus === OutboundStatus.PICKED ||
      currentStatus === OutboundStatus.READY_TO_SHIP
    ) {
      await tx.outboundLine.updateMany({
        where: {
          orderId,
          status: { not: 'CANCELLED' },
        },
        data: {
          pickedQty: 0,
          version: { increment: 1 },
        },
      });

      await tx.outboundOrder.update({
        where: { id: orderId },
        data: {
          status: OutboundStatus.PICKING,
          version: { increment: 1 },

          pickedSubmittedByUserId: null,
          pickedSubmittedAt: null,

          // 검수 완료 정보 초기화
          verifiedByUserId: null,
          verifiedAt: null,

          // 배송 시작 정보 초기화
          shippingStartedByUserId: null,
          shippingStartedAt: null,

          // 배송 완료 정보 초기화
          deliveredByUserId: null,
          deliveredAt: null,
        },
      });
    }
  }

  private async ensureItemsBelongToCompanyTx(
    tx: Tx,
    companyId: string,
    itemIds: string[],
  ) {
    const uniqueItemIds = Array.from(new Set(itemIds));
    if (uniqueItemIds.length === 0) return;

    const items = await tx.item.findMany({
      where: { companyId, id: { in: uniqueItemIds } },
      select: { id: true },
    });

    if (items.length !== uniqueItemIds.length) {
      throw new BadRequestException('Invalid itemId for company');
    }
  }
}
