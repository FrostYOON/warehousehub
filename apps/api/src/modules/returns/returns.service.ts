import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InventoryTxType,
  ReturnLineDecision,
  ReturnStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

import { CreateReturnReceiptDto } from './dto/create-return.dto';
import { UpdateReturnReceiptDto } from './dto/update-return.dto';
import { DecideReturnReceiptDto } from './dto/decide-return.dto';
import { ProcessReturnReceiptDto } from './dto/process-return.dto';

@Injectable()
export class ReturnsService {
  constructor(private readonly prisma: PrismaService) {}

  // 1) 리턴 접수 (DELIVERY/SALES/ADMIN)
  async create(companyId: string, userId: string, dto: CreateReturnReceiptDto) {
    if (!dto.lines?.length) {
      throw new BadRequestException('lines is required');
    }

    // customerId가 오면 회사 소속인지 검증
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, companyId },
        select: { id: true },
      });
      if (!customer) throw new BadRequestException('Invalid customerId');
    }

    // itemId 검증(회사 범위)
    const itemIds = dto.lines.map((l) => l.itemId);
    const items = await this.prisma.item.findMany({
      where: { companyId, id: { in: itemIds } },
      select: { id: true },
    });
    if (items.length !== new Set(itemIds).size) {
      throw new BadRequestException('Invalid itemId in lines');
    }

    const receipt = await this.prisma.returnReceipt.create({
      data: {
        companyId,
        customerId: dto.customerId ?? null,
        receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : undefined,
        memo: dto.memo,
        status: ReturnStatus.RECEIVED,
        receivedByUserId: userId,
        lines: {
          create: dto.lines.map((l) => ({
            itemId: l.itemId,
            storageType: l.storageType,
            expiryDate: l.expiryDate ? new Date(l.expiryDate) : null,
            qty: l.qty,
          })),
        },
      },
      include: { lines: true, customer: true },
    });

    return receipt;
  }

  // 2) 리스트
  list(companyId: string) {
    return this.prisma.returnReceipt.findMany({
      where: { companyId },
      orderBy: { receivedAt: 'desc' },
      include: {
        customer: true,
        lines: {
          include: { item: true },
        },
      },
    });
  }

  // 3) 상세
  async detail(companyId: string, id: string) {
    const receipt = await this.prisma.returnReceipt.findFirst({
      where: { id, companyId },
      include: {
        customer: true,
        lines: {
          include: { item: true },
        },
      },
    });
    if (!receipt) throw new NotFoundException('Return receipt not found');
    return receipt;
  }

  // 4) 접수 수정 (RECEIVED에서만)
  // - 헤더: customerId/receivedAt/memo 수정(필요 시 null로 clear 가능)
  // - 라인: 수정/추가/삭제 지원
  //   * 기존 라인 수정: patch.id 필수
  //   * 라인 추가: patch.id 없이 itemId/storageType/qty 필수
  //   * 라인 삭제: patch.id + patch.isDeleted = true
  async update(companyId: string, id: string, dto: UpdateReturnReceiptDto) {
    return this.prisma.$transaction(async (tx) => {
      const receipt = await tx.returnReceipt.findFirst({
        where: { id, companyId },
        include: { lines: true },
      });
      if (!receipt) throw new NotFoundException('Return receipt not found');

      if (receipt.status !== ReturnStatus.RECEIVED) {
        throw new BadRequestException('Only RECEIVED receipts can be updated');
      }

      // customerId 검증(있으면 회사 범위 확인)
      if (dto.customerId) {
        const customer = await tx.customer.findFirst({
          where: { id: dto.customerId, companyId },
          select: { id: true },
        });
        if (!customer) throw new BadRequestException('Invalid customerId');
      }

      // 라인 변경이 있는 경우 itemId 검증(회사 범위)
      if (dto.lines?.length) {
        const candidateItemIds = dto.lines
          .map((p) => p.itemId)
          .filter((v): v is string => typeof v === 'string');
        const uniq = Array.from(new Set(candidateItemIds));
        if (uniq.length) {
          const items = await tx.item.findMany({
            where: { companyId, id: { in: uniq } },
            select: { id: true },
          });
          if (items.length !== uniq.length) {
            throw new BadRequestException('Invalid itemId in lines');
          }
        }
      }

      // 헤더 업데이트 (undefined = 변경 없음, null = clear)
      await tx.returnReceipt.update({
        where: { id },
        data: {
          customerId:
            dto.customerId === undefined ? undefined : (dto.customerId ?? null),
          receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : undefined,
          memo: dto.memo === undefined ? undefined : (dto.memo ?? null),
          version: { increment: 1 },
          updatedAt: new Date(),
        },
      });

      // 라인 업데이트/추가/삭제
      if (dto.lines?.length) {
        const existingById = new Map(receipt.lines.map((l) => [l.id, l]));

        for (const patch of dto.lines) {
          const isDeleted = patch.isDeleted === true;

          // 4-1) 기존 라인 수정/삭제
          if (patch.id) {
            const line = existingById.get(patch.id);
            if (!line) throw new BadRequestException('Invalid line id');

            // 결정/처리된 라인은 접수 수정 단계에서 건드리지 않음
            if (line.decision || line.processedAt) {
              throw new BadRequestException(
                'Cannot update decided/processed line',
              );
            }

            if (isDeleted) {
              await tx.returnReceiptLine.delete({ where: { id: patch.id } });
              continue;
            }

            await tx.returnReceiptLine.update({
              where: { id: patch.id },
              data: {
                // (선택) 상품/보관타입 변경도 허용
                itemId: patch.itemId ?? undefined,
                storageType: patch.storageType ?? undefined,

                qty: patch.qty ?? undefined,
                expiryDate:
                  patch.clearExpiryDate === true
                    ? null
                    : patch.expiryDate === undefined
                      ? undefined
                      : new Date(patch.expiryDate),

                version: { increment: 1 },
                updatedAt: new Date(),
              },
            });
            continue;
          }

          // 4-2) 라인 추가 (patch.id 없음)
          if (isDeleted) {
            throw new BadRequestException('Invalid line patch');
          }

          if (!patch.itemId || !patch.storageType || !patch.qty) {
            throw new BadRequestException(
              'New line requires itemId, storageType, qty',
            );
          }

          await tx.returnReceiptLine.create({
            data: {
              receiptId: receipt.id,
              itemId: patch.itemId,
              storageType: patch.storageType,
              expiryDate: patch.expiryDate ? new Date(patch.expiryDate) : null,
              qty: patch.qty,
            },
          });
        }

        // receipt.updatedAt 보장
        await tx.returnReceipt.update({
          where: { id: receipt.id },
          data: { updatedAt: new Date() },
        });
      }

      return tx.returnReceipt.findFirst({
        where: { id, companyId },
        include: { customer: true, lines: { include: { item: true } } },
      });
    });
  }

  // 4-1) 접수 취소 (RECEIVED에서만)
  async cancel(companyId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const receipt = await tx.returnReceipt.findFirst({
        where: { id, companyId },
        select: { id: true, status: true },
      });
      if (!receipt) throw new NotFoundException('Return receipt not found');

      if (receipt.status !== ReturnStatus.RECEIVED) {
        throw new BadRequestException(
          'Only RECEIVED receipts can be cancelled',
        );
      }

      await tx.returnReceipt.update({
        where: { id },
        data: {
          status: ReturnStatus.CANCELLED,
          version: { increment: 1 },
          updatedAt: new Date(),
        },
      });

      return { message: 'Cancelled' };
    });
  }

  // 5) 결정(재입고/폐기) - WH_MANAGER/ADMIN, RECEIVED -> DECIDED
  async decide(
    companyId: string,
    userId: string,
    id: string,
    dto: DecideReturnReceiptDto,
  ) {
    if (!dto.lines?.length) throw new BadRequestException('lines is required');

    return this.prisma.$transaction(async (tx) => {
      const receipt = await tx.returnReceipt.findFirst({
        where: { id, companyId },
        include: { lines: true },
      });
      if (!receipt) throw new NotFoundException('Return receipt not found');

      if (receipt.status !== ReturnStatus.RECEIVED) {
        throw new BadRequestException('Only RECEIVED receipts can be decided');
      }

      // lineId 검증 + 결정 업데이트
      const lineMap = new Map(receipt.lines.map((l) => [l.id, l]));
      for (const d of dto.lines) {
        const line = lineMap.get(d.lineId);
        if (!line) throw new BadRequestException('Invalid lineId');

        await tx.returnReceiptLine.update({
          where: { id: d.lineId },
          data: {
            decision: d.decision,
            decidedByUserId: userId,
            decidedAt: new Date(),
            version: { increment: 1 },
          },
        });
      }

      await tx.returnReceipt.update({
        where: { id },
        data: {
          status: ReturnStatus.DECIDED,
          decidedByUserId: userId,
          decidedAt: new Date(),
          version: { increment: 1 },
        },
      });

      return tx.returnReceipt.findFirst({
        where: { id, companyId },
        include: { customer: true, lines: { include: { item: true } } },
      });
    });
  }

  // 6) 재고 반영 - WH_MANAGER/ADMIN, DECIDED -> COMPLETED(라인 단위 처리)
  async process(
    companyId: string,
    userId: string,
    id: string,
    dto: ProcessReturnReceiptDto,
  ) {
    if (!dto.lineIds?.length)
      throw new BadRequestException('lineIds is required');

    return this.prisma.$transaction(async (tx) => {
      const receipt = await tx.returnReceipt.findFirst({
        where: { id, companyId },
        include: { lines: true, customer: true },
      });
      if (!receipt) throw new NotFoundException('Return receipt not found');

      if (receipt.status !== ReturnStatus.DECIDED) {
        throw new BadRequestException('Only DECIDED receipts can be processed');
      }

      const targetLines = receipt.lines.filter((l) =>
        dto.lineIds.includes(l.id),
      );
      if (targetLines.length !== dto.lineIds.length) {
        throw new BadRequestException('Invalid lineIds');
      }

      // tx header 생성(원장 기록)
      // - RESTOCK / DISCARD가 섞일 수 있으므로, 타입별로 필요할 때만 생성
      let restockTxId: string | null = null;
      let discardTxId: string | null = null;

      const ensureRestockTx = async () => {
        if (restockTxId) return restockTxId;
        const invTx = await tx.inventoryTx.create({
          data: {
            companyId,
            type: InventoryTxType.RETURN_RESTOCK,
            actorUserId: userId,
            refType: 'RETURN_RECEIPT',
            refId: receipt.id,
          },
        });
        restockTxId = invTx.id;
        return restockTxId;
      };

      const ensureDiscardTx = async () => {
        if (discardTxId) return discardTxId;
        const invTx = await tx.inventoryTx.create({
          data: {
            companyId,
            type: InventoryTxType.RETURN_DISCARD,
            actorUserId: userId,
            refType: 'RETURN_RECEIPT',
            refId: receipt.id,
          },
        });
        discardTxId = invTx.id;
        return discardTxId;
      };

      // 기본 정책:
      // - RESTOCK: Lot 생성/조회 후 해당 창고(StorageType에 맞는 warehouse) Stock.onHand 증가
      // - DISCARD: 재고 반영 없음(원장만 기록), processedAt만 찍음
      for (const line of targetLines) {
        if (!line.decision) {
          throw new BadRequestException(
            'Line decision is required before processing',
          );
        }
        if (line.processedAt) {
          continue; // 이미 처리된 라인은 skip
        }

        if (line.decision === ReturnLineDecision.RESTOCK) {
          // 창고 찾기(회사당 type 유니크)
          const wh = await tx.warehouse.findFirst({
            where: { companyId, type: line.storageType },
            select: { id: true },
          });
          if (!wh)
            throw new BadRequestException(
              'Warehouse not found for storageType',
            );

          // 유통기한 nullable 이므로 null/날짜를 분기해 lot 확보
          let lot: { id: string };
          if (line.expiryDate === null) {
            const existingLot = await tx.lot.findFirst({
              where: {
                companyId,
                itemId: line.itemId,
                expiryDate: null,
              },
              select: { id: true },
            });
            if (!existingLot) {
              lot = await tx.lot.create({
                data: {
                  companyId,
                  itemId: line.itemId,
                  expiryDate: null,
                },
                select: { id: true },
              });
            } else {
              lot = existingLot;
            }
          } else {
            lot = await tx.lot.upsert({
              where: {
                companyId_itemId_expiryDate: {
                  companyId,
                  itemId: line.itemId,
                  expiryDate: line.expiryDate,
                },
              },
              update: {},
              create: {
                companyId,
                itemId: line.itemId,
                expiryDate: line.expiryDate,
              },
              select: { id: true },
            });
          }

          // Stock upsert(회사+warehouse+lot 유니크)
          await tx.stock.upsert({
            where: {
              companyId_warehouseId_lotId: {
                companyId,
                warehouseId: wh.id,
                lotId: lot.id,
              },
            },
            update: {
              onHand: { increment: line.qty },
            },
            create: {
              companyId,
              warehouseId: wh.id,
              lotId: lot.id,
              onHand: line.qty,
              reserved: 0,
            },
          });

          // InventoryTxLine 기록(+qty)
          const txId = await ensureRestockTx();
          await tx.inventoryTxLine.create({
            data: {
              txId,
              warehouseId: wh.id,
              lotId: lot.id,
              qtyDelta: line.qty,
            },
          });
        }

        if (line.decision === ReturnLineDecision.DISCARD) {
          // 폐기는 재고 반영 없음. 대신 원장 헤더를 남겨 Audit 가능하게 함
          await ensureDiscardTx();
        }

        await tx.returnReceiptLine.update({
          where: { id: line.id },
          data: {
            processedByUserId: userId,
            processedAt: new Date(),
            version: { increment: 1 },
          },
        });
      }

      // 모든 라인이 processedAt 있으면 COMPLETED로 전환
      const remaining = await tx.returnReceiptLine.count({
        where: { receiptId: receipt.id, processedAt: null },
      });

      if (remaining === 0) {
        await tx.returnReceipt.update({
          where: { id: receipt.id },
          data: {
            status: ReturnStatus.COMPLETED,
            completedByUserId: userId,
            completedAt: new Date(),
            version: { increment: 1 },
          },
        });
      }

      return tx.returnReceipt.findFirst({
        where: { id: receipt.id, companyId },
        include: { customer: true, lines: { include: { item: true } } },
      });
    });
  }
}
