import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  InventoryTxType,
  OutboundStatus,
  OutboundLineStatus,
  StorageType,
} from '@prisma/client';
import { CreateOutboundOrderDto } from './dto/create-outbound-order.dto';
import { PickReserveDto, PickReserveMode } from './dto/pick-reserve.dto';
import { AddOutboundLineDto } from './dto/add-outbound-line.dto';
import { UpdateOutboundLineDto } from './dto/update-outbound-line.dto';

@Injectable()
export class OutboundService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, userId: string, dto: CreateOutboundOrderDto) {
    // 1) 고객사 존재 + 활성 여부 확인
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, companyId, isActive: true },
      select: { id: true },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    // 2) itemId가 전부 내 회사 아이템인지 검증(테넌트 보안)
    const itemIds = dto.lines.map((l) => l.itemId);
    const items = await this.prisma.item.findMany({
      where: { companyId, id: { in: itemIds } },
      select: { id: true },
    });

    if (items.length !== new Set(itemIds).size) {
      throw new BadRequestException('Invalid itemId in lines');
    }

    return this.prisma.outboundOrder.create({
      data: {
        companyId,
        customerId: dto.customerId,
        plannedDate: new Date(dto.plannedDate),
        memo: dto.memo?.trim(),
        createdByUserId: userId,
        status: 'DRAFT',
        lines: {
          create: dto.lines.map((l) => ({
            itemId: l.itemId,
            requestedQty: l.requestedQty,
          })),
        },
      },
      include: {
        customer: true,
        lines: true,
      },
    });
  }

  list(companyId: string) {
    return this.prisma.outboundOrder.findMany({
      where: { companyId },
      orderBy: { plannedDate: 'asc' },
      include: {
        customer: true,
        lines: true,
      },
    });
  }

  async detail(companyId: string, id: string) {
    const order = await this.prisma.outboundOrder.findFirst({
      where: { id, companyId },
      include: {
        customer: true,
        lines: true,
      },
    });

    if (!order) throw new NotFoundException('OutboundOrder not found');
    return order;
  }

  async cancelLine(
    companyId: string,
    userId: string,
    orderId: string,
    lineId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const line = await tx.outboundLine.findFirst({
        where: { id: lineId, orderId },
      });

      if (!line) throw new NotFoundException('Line not found');

      if (line.status === OutboundLineStatus.CANCELLED) {
        throw new BadRequestException('Already cancelled');
      }

      // 이미 출고 확정된 라인은 취소 불가
      if (line.shippedQty > 0) {
        throw new BadRequestException(
          'Cannot cancel line after shipment confirmation',
        );
      }

      // 🔹 미확정 PickAllocation 조회
      const allocations = await tx.pickAllocation.findMany({
        where: {
          outboundLineId: lineId,
          isReleased: false,
          isCommitted: false,
        },
      });

      // 🔹 reserved 감소 + allocation release
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
            reserved: {
              decrement: alloc.qty,
            },
          },
        });

        await tx.pickAllocation.update({
          where: { id: alloc.id },
          data: {
            isReleased: true,
            releasedAt: new Date(),
          },
        });
      }

      // 🔹 InventoryTx 기록
      if (allocations.length > 0) {
        const txRecord = await tx.inventoryTx.create({
          data: {
            companyId,
            type: InventoryTxType.PICK_RELEASE,
            actorUserId: userId,
            refType: 'OUTBOUND_LINE',
            refId: lineId,
          },
        });

        await tx.inventoryTxLine.createMany({
          data: allocations.map((alloc) => ({
            txId: txRecord.id,
            warehouseId: alloc.warehouseId,
            lotId: alloc.lotId,
            qtyDelta: alloc.qty * -1,
          })),
        });
      }

      // 🔹 라인 취소
      await tx.outboundLine.update({
        where: { id: lineId },
        data: {
          status: OutboundLineStatus.CANCELLED,
        },
      });

      return { message: 'Line cancelled and picks released' };
    });
  }

  async reservePick(
    companyId: string,
    userId: string,
    orderId: string,
    dto: PickReserveDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.outboundOrder.findFirst({
        where: { id: orderId, companyId },
        include: { lines: true },
      });
      if (!order) throw new NotFoundException('Order not found');

      if (
        order.status !== OutboundStatus.DRAFT &&
        order.status !== OutboundStatus.PICKING
      ) {
        throw new BadRequestException('Order is not pickable');
      }

      // tx(감사로그) 생성
      const inv = await tx.inventoryTx.create({
        data: {
          companyId,
          type: InventoryTxType.PICK_RESERVE,
          actorUserId: userId,
          refType: 'OUTBOUND_ORDER',
          refId: orderId,
        },
      });

      // 주문 상태 PICKING으로 올림
      if (order.status === OutboundStatus.DRAFT) {
        await tx.outboundOrder.update({
          where: { id: orderId },
          data: { status: OutboundStatus.PICKING },
        });
      }

      for (const req of dto.allocations) {
        const line = order.lines.find((l) => l.id === req.outboundLineId);
        if (!line) throw new NotFoundException('Line not found');

        if (line.status === OutboundLineStatus.CANCELLED) {
          throw new BadRequestException('Cannot pick cancelled line');
        }

        // 이미 픽된 수량 고려: 요청 수량을 초과 픽 금지
        const remaining = line.requestedQty - line.pickedQty;
        if (remaining <= 0) {
          throw new BadRequestException('Line already fully picked');
        }
        if (req.qty > remaining) {
          throw new BadRequestException('Pick qty exceeds requested remaining');
        }

        if (req.mode === PickReserveMode.MANUAL) {
          if (!req.warehouseId || !req.lotId) {
            throw new BadRequestException('warehouseId and lotId are required');
          }

          // Stock 존재/수량 확인
          const stock = await tx.stock.findFirst({
            where: {
              companyId,
              warehouseId: req.warehouseId,
              lotId: req.lotId,
            },
            include: { warehouse: true },
          });
          if (!stock) throw new NotFoundException('Stock not found');

          const available = stock.onHand - stock.reserved;
          if (available < req.qty) {
            throw new BadRequestException('Insufficient available stock');
          }

          // reserved 증가
          await tx.stock.update({
            where: {
              companyId_warehouseId_lotId: {
                companyId,
                warehouseId: req.warehouseId,
                lotId: req.lotId,
              },
            },
            data: { reserved: { increment: req.qty } },
          });

          // allocation 생성
          await tx.pickAllocation.create({
            data: {
              companyId,
              outboundLineId: line.id,
              warehouseId: req.warehouseId,
              lotId: req.lotId,
              qty: req.qty,
            },
          });

          // pickedQty 증가
          await tx.outboundLine.update({
            where: { id: line.id },
            data: { pickedQty: { increment: req.qty } },
          });

          // 감사로그 line
          await tx.inventoryTxLine.create({
            data: {
              txId: inv.id,
              warehouseId: req.warehouseId,
              lotId: req.lotId,
              qtyDelta: req.qty,
            },
          });

          continue;
        }

        // AUTO(FEFO)
        if (req.mode === PickReserveMode.AUTO) {
          if (!req.storageType) {
            throw new BadRequestException('storageType is required for AUTO');
          }

          let remainingQty = req.qty;

          // FEFO: expiryDate asc, null은 마지막
          const stocks = await tx.stock.findMany({
            where: {
              companyId,
              warehouse: { type: req.storageType },
              lot: { itemId: line.itemId },
            },
            include: { warehouse: true, lot: true },
            orderBy: [{ lot: { expiryDate: 'asc' } }],
          });

          for (const s of stocks) {
            if (remainingQty <= 0) break;

            const available = s.onHand - s.reserved;
            if (available <= 0) continue;

            const take = Math.min(available, remainingQty);

            await tx.stock.update({
              where: {
                companyId_warehouseId_lotId: {
                  companyId,
                  warehouseId: s.warehouseId,
                  lotId: s.lotId,
                },
              },
              data: { reserved: { increment: take } },
            });

            await tx.pickAllocation.create({
              data: {
                companyId,
                outboundLineId: line.id,
                warehouseId: s.warehouseId,
                lotId: s.lotId,
                qty: take,
              },
            });

            await tx.outboundLine.update({
              where: { id: line.id },
              data: { pickedQty: { increment: take } },
            });

            await tx.inventoryTxLine.create({
              data: {
                txId: inv.id,
                warehouseId: s.warehouseId,
                lotId: s.lotId,
                qtyDelta: take,
              },
            });

            remainingQty -= take;
          }

          if (remainingQty > 0) {
            throw new BadRequestException(
              'Insufficient stock for AUTO FEFO pick',
            );
          }

          continue;
        }

        throw new BadRequestException('Invalid mode');
      }

      return { message: 'Pick reserved' };
    });
  }

  async confirm(companyId: string, userId: string, orderId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.outboundOrder.findFirst({
        where: { id: orderId, companyId },
        include: {
          lines: true,
        },
      });

      if (!order) throw new NotFoundException('Order not found');

      if (order.status !== 'PICKING')
        throw new BadRequestException('Only PICKING orders can be confirmed');

      const allocations = await tx.pickAllocation.findMany({
        where: {
          companyId,
          outboundLine: { orderId },
          isReleased: false,
          isCommitted: false,
        },
        include: {
          warehouse: true,
        },
      });

      if (allocations.length === 0)
        throw new BadRequestException('No picked allocations found');

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
          data: {
            isCommitted: true,
            committedAt: new Date(),
          },
        });
      }

      for (const line of order.lines) {
        await tx.outboundLine.update({
          where: { id: line.id },
          data: {
            shippedQty: line.pickedQty,
          },
        });
      }

      await tx.outboundOrder.update({
        where: { id: orderId },
        data: {
          status: 'CONFIRMED',
          confirmedByUserId: userId,
          confirmedAt: new Date(),
        },
      });

      await tx.inventoryTx.create({
        data: {
          companyId,
          type: 'OUTBOUND_CONFIRM',
          actorUserId: userId,
          refType: 'OUTBOUND_ORDER',
          refId: orderId,
        },
      });

      return { message: 'Outbound confirmed' };
    });
  }

  async addLine(
    companyId: string,
    userId: string,
    orderId: string,
    dto: AddOutboundLineDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.outboundOrder.findFirst({
        where: { id: orderId, companyId },
        select: { id: true, status: true },
      });
      if (!order) throw new NotFoundException('Order not found');

      if (order.status === OutboundStatus.CONFIRMED) {
        throw new BadRequestException('Cannot edit confirmed order');
      }

      // item이 내 회사 item인지 검증
      const item = await tx.item.findFirst({
        where: { id: dto.itemId, companyId, isActive: true },
        select: { id: true },
      });
      if (!item) throw new BadRequestException('Invalid itemId');

      return tx.outboundLine.create({
        data: {
          orderId,
          itemId: dto.itemId,
          requestedQty: dto.requestedQty,
          status: OutboundLineStatus.ACTIVE,
        },
      });
    });
  }

  async updateLineRequestedQty(
    companyId: string,
    userId: string,
    orderId: string,
    lineId: string,
    dto: UpdateOutboundLineDto,
  ) {
    if (dto.requestedQty === undefined) {
      throw new BadRequestException('requestedQty is required');
    }

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.outboundOrder.findFirst({
        where: { id: orderId, companyId },
        select: { id: true, status: true },
      });
      if (!order) throw new NotFoundException('Order not found');

      if (order.status === OutboundStatus.CONFIRMED) {
        throw new BadRequestException('Cannot edit confirmed order');
      }

      const line = await tx.outboundLine.findFirst({
        where: { id: lineId, orderId },
        select: {
          id: true,
          status: true,
          itemId: true,
          requestedQty: true,
          pickedQty: true,
          shippedQty: true,
        },
      });
      if (!line) throw new NotFoundException('Line not found');
      if (line.status === OutboundLineStatus.CANCELLED) {
        throw new BadRequestException('Line already cancelled');
      }
      if (line.shippedQty > 0) {
        throw new BadRequestException('Cannot edit shipped line');
      }

      const newRequested = dto.requestedQty;

      // requested=0이면: 자동으로 전체 release + CANCELLED
      if (newRequested === 0) {
        // 기존 cancelLine 로직을 그대로 재사용하는게 가장 안전
        // (cancelLine이 tx를 또 열면 안 되므로 tx 버전이 없으면 아래 방식으로 직접 처리해야 함)
        // 여기서는 "직접 처리"로 간단히 구현합니다.

        // 미확정 allocation 모두 조회
        const allocations = await tx.pickAllocation.findMany({
          where: {
            companyId,
            outboundLineId: lineId,
            isReleased: false,
            isCommitted: false,
          },
          orderBy: { createdAt: 'desc' },
        });

        // release 전부
        if (allocations.length > 0) {
          const inv = await tx.inventoryTx.create({
            data: {
              companyId,
              type: InventoryTxType.PICK_RELEASE,
              actorUserId: userId,
              refType: 'OUTBOUND_LINE',
              refId: lineId,
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

            await tx.inventoryTxLine.create({
              data: {
                txId: inv.id,
                warehouseId: alloc.warehouseId,
                lotId: alloc.lotId,
                qtyDelta: -alloc.qty,
              },
            });
          }
        }

        await tx.outboundLine.update({
          where: { id: lineId },
          data: {
            requestedQty: 0,
            pickedQty: 0,
            status: OutboundLineStatus.CANCELLED,
          },
        });

        return { message: 'Line cancelled (auto released)' };
      }

      // requestedQty 업데이트
      await tx.outboundLine.update({
        where: { id: lineId },
        data: { requestedQty: newRequested },
      });

      // 초과 픽이면 자동 release
      const overPicked = line.pickedQty - (newRequested ?? 0);
      if (overPicked <= 0) {
        return { message: 'Line updated' };
      }

      // 초과 픽(overPicked)만큼, 최신 allocation부터 해제(LIFO)
      let remainToRelease = overPicked;

      const inv = await tx.inventoryTx.create({
        data: {
          companyId,
          type: InventoryTxType.PICK_RELEASE,
          actorUserId: userId,
          refType: 'OUTBOUND_LINE',
          refId: lineId,
          memo: 'Auto release due to requestedQty decrease',
        },
      });

      const allocations = await tx.pickAllocation.findMany({
        where: {
          companyId,
          outboundLineId: lineId,
          isReleased: false,
          isCommitted: false,
        },
        orderBy: { createdAt: 'desc' },
      });

      for (const alloc of allocations) {
        if (remainToRelease <= 0) break;

        const releaseQty = Math.min(alloc.qty, remainToRelease);

        // reserved 감소
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

        // allocation 부분 해제 처리
        if (releaseQty === alloc.qty) {
          await tx.pickAllocation.update({
            where: { id: alloc.id },
            data: { isReleased: true, releasedAt: new Date() },
          });
        } else {
          // 일부만 해제: alloc.qty 줄이고, 해제된 qty는 released allocation으로 기록(추적 목적)
          await tx.pickAllocation.update({
            where: { id: alloc.id },
            data: { qty: { decrement: releaseQty } },
          });

          await tx.pickAllocation.create({
            data: {
              companyId,
              outboundLineId: lineId,
              warehouseId: alloc.warehouseId,
              lotId: alloc.lotId,
              qty: releaseQty,
              isReleased: true,
              releasedAt: new Date(),
            },
          });
        }

        // 감사로그
        await tx.inventoryTxLine.create({
          data: {
            txId: inv.id,
            warehouseId: alloc.warehouseId,
            lotId: alloc.lotId,
            qtyDelta: -releaseQty,
          },
        });

        remainToRelease -= releaseQty;
      }

      if (remainToRelease > 0) {
        // 이론상 발생하면 데이터 꼬인 것
        throw new BadRequestException(
          'Auto release failed: not enough allocations',
        );
      }

      // pickedQty도 초과분만큼 감소
      await tx.outboundLine.update({
        where: { id: lineId },
        data: { pickedQty: { decrement: overPicked } },
      });

      return { message: 'Line updated (auto released)' };
    });
  }
}
