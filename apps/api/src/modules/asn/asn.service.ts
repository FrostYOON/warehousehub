import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AsnStatus, Prisma } from '@prisma/client';
import { CreateAsnDto } from './dto/create-asn.dto';
import { ListAsnQueryDto } from './dto/list-asn-query.dto';

@Injectable()
export class AsnService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string, query: ListAsnQueryDto) {
    const { status, toBranchId, toWarehouseId } = query;
    const where: Prisma.AsnWhereInput = { companyId };
    if (status) where.status = status;
    if (toBranchId) where.toBranchId = toBranchId;
    if (toWarehouseId) where.toWarehouseId = toWarehouseId;

    return this.prisma.asn.findMany({
      where,
      orderBy: { expectedDate: 'desc' },
      include: {
        fromBranch: { select: { id: true, name: true, code: true } },
        fromWarehouse: { select: { id: true, name: true, type: true } },
        toBranch: { select: { id: true, name: true, code: true } },
        toWarehouse: { select: { id: true, name: true, type: true } },
        lines: {
          include: {
            item: { select: { id: true, itemCode: true, itemName: true } },
          },
        },
        createdByUser: { select: { id: true, name: true } },
      },
    });
  }

  async findById(companyId: string, id: string) {
    const asn = await this.prisma.asn.findFirst({
      where: { id, companyId },
      include: {
        fromBranch: { select: { id: true, name: true, code: true } },
        fromWarehouse: { select: { id: true, name: true, type: true } },
        toBranch: { select: { id: true, name: true, code: true } },
        toWarehouse: { select: { id: true, name: true, type: true } },
        lines: {
          include: {
            item: { select: { id: true, itemCode: true, itemName: true } },
          },
        },
        createdByUser: { select: { id: true, name: true } },
      },
    });
    if (!asn) throw new NotFoundException('입고 예정을 찾을 수 없습니다.');
    return asn;
  }

  async create(companyId: string, userId: string, dto: CreateAsnDto) {
    if (!dto.lines?.length) {
      throw new BadRequestException('lines는 1건 이상 필요합니다.');
    }

    const [toBranch, toWarehouse] = await Promise.all([
      this.prisma.branch.findFirst({
        where: { id: dto.toBranchId, companyId },
        select: { id: true },
      }),
      this.prisma.warehouse.findFirst({
        where: { id: dto.toWarehouseId, companyId },
        select: { id: true, branchId: true },
      }),
    ]);
    if (!toBranch)
      throw new NotFoundException('도착 지사를 찾을 수 없습니다.');
    if (!toWarehouse)
      throw new NotFoundException('도착 창고를 찾을 수 없습니다.');
    if (toWarehouse.branchId !== dto.toBranchId) {
      throw new BadRequestException(
        '도착 창고가 선택한 도착 지사에 속하지 않습니다.',
      );
    }

    if (dto.fromBranchId) {
      const fromBranch = await this.prisma.branch.findFirst({
        where: { id: dto.fromBranchId, companyId },
        select: { id: true },
      });
      if (!fromBranch)
        throw new NotFoundException('출발 지사를 찾을 수 없습니다.');
    }
    if (dto.fromWarehouseId) {
      const fromWh = await this.prisma.warehouse.findFirst({
        where: { id: dto.fromWarehouseId, companyId },
        select: { id: true },
      });
      if (!fromWh)
        throw new NotFoundException('출발 창고를 찾을 수 없습니다.');
    }

    const itemIds = [...new Set(dto.lines.map((l) => l.itemId))];
    const items = await this.prisma.item.findMany({
      where: { id: { in: itemIds }, companyId, isActive: true },
      select: { id: true },
    });
    const foundIds = new Set(items.map((i) => i.id));
    const missing = itemIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `품목을 찾을 수 없습니다: ${missing.join(', ')}`,
      );
    }

    const expectedDate = new Date(dto.expectedDate);

    return this.prisma.asn.create({
      data: {
        companyId,
        fromBranchId: dto.fromBranchId || null,
        fromWarehouseId: dto.fromWarehouseId || null,
        toBranchId: dto.toBranchId,
        toWarehouseId: dto.toWarehouseId,
        expectedDate,
        status: AsnStatus.PENDING,
        createdByUserId: userId,
        lines: {
          create: dto.lines.map((l) => ({
            itemId: l.itemId,
            quantity: l.quantity,
            expiryDate: l.expiryDate ? new Date(l.expiryDate) : null,
          })),
        },
      },
      include: {
        fromBranch: { select: { id: true, name: true, code: true } },
        fromWarehouse: { select: { id: true, name: true, type: true } },
        toBranch: { select: { id: true, name: true, code: true } },
        toWarehouse: { select: { id: true, name: true, type: true } },
        lines: {
          include: {
            item: { select: { id: true, itemCode: true, itemName: true } },
          },
        },
        createdByUser: { select: { id: true, name: true } },
      },
    });
  }

  async cancel(companyId: string, id: string) {
    const asn = await this.prisma.asn.findFirst({
      where: { id, companyId },
      select: { id: true, status: true },
    });
    if (!asn) throw new NotFoundException('입고 예정을 찾을 수 없습니다.');
    if (asn.status !== AsnStatus.PENDING) {
      throw new BadRequestException(
        '대기(PENDING) 상태인 입고 예정만 취소할 수 있습니다.',
      );
    }

    return this.prisma.asn.update({
      where: { id },
      data: { status: AsnStatus.CANCELLED },
      include: {
        toBranch: { select: { id: true, name: true } },
        toWarehouse: { select: { id: true, name: true } },
        lines: {
          include: {
            item: { select: { itemCode: true, itemName: true } },
          },
        },
      },
    });
  }
}
