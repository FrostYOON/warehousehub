import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { getModuleLogger } from '../../common/logging/module-logger';

const logger = getModuleLogger('ItemsService');

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeRequiredString(value: string, field: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new BadRequestException(`${field} is required`);
    }
    return trimmed;
  }

  private normalizeOptionalStringForUpdate(
    value?: string,
  ): string | null | undefined {
    if (value === undefined) return undefined;
    const trimmed = value.trim();
    return trimmed || null;
  }

  private normalizeRequiredStringForUpdate(
    value: string | undefined,
    field: string,
  ): string | undefined {
    if (value === undefined) return undefined;
    return this.normalizeRequiredString(value, field);
  }

  async create(companyId: string, dto: CreateItemDto) {
    try {
      return await this.prisma.item.create({
        data: {
          companyId,
          itemCode: this.normalizeRequiredString(dto.itemCode, 'itemCode'),
          itemName: this.normalizeRequiredString(dto.itemName, 'itemName'),
          unitCost:
            dto.unitCost != null && Number.isFinite(dto.unitCost)
              ? dto.unitCost
              : undefined,
        },
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          '같은 회사 내에 동일한 품목 코드가 이미 등록되어 있습니다.',
        );
      }
      throw error;
    }
  }

  async list(
    companyId: string,
    opts?: {
      q?: string;
      includeInactive?: boolean;
      isActive?: boolean;
      page?: number;
      pageSize?: number;
    },
  ) {
    const { q, includeInactive, isActive, page = 1, pageSize = 500 } =
      opts ?? {};
    const isActiveFilter =
      includeInactive === true
        ? undefined
        : isActive !== undefined
          ? { isActive }
          : { isActive: true };

    const where = {
      companyId,
      ...isActiveFilter,
      ...(q
        ? {
            OR: [
              { itemCode: { contains: q, mode: Prisma.QueryMode.insensitive } },
              { itemName: { contains: q, mode: Prisma.QueryMode.insensitive } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.item.count({ where }),
      this.prisma.item.findMany({
        where,
        orderBy: { itemCode: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { total, page, pageSize, items };
  }

  async findById(companyId: string, id: string) {
    const item = await this.prisma.item.findFirst({
      where: { id, companyId },
    });
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }

  async update(companyId: string, id: string, dto: UpdateItemDto) {
    const found = await this.prisma.item.findFirst({
      where: { id, companyId },
    });
    if (!found) throw new NotFoundException('Item not found');

    try {
      const updated = await this.prisma.item.update({
        where: { id },
        data: {
          itemCode: this.normalizeRequiredStringForUpdate(
            dto.itemCode,
            'itemCode',
          ),
          itemName: this.normalizeRequiredStringForUpdate(
            dto.itemName,
            'itemName',
          ),
          unitCost:
            dto.unitCost !== undefined
              ? Number.isFinite(dto.unitCost)
                ? dto.unitCost
                : null
              : undefined,
        },
      });
      logger.info({
        event: 'items.update.success',
        companyId,
        itemId: id,
      });
      return updated;
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          '같은 회사 내에 동일한 품목 코드가 이미 등록되어 있습니다.',
        );
      }
      throw error;
    }
  }

  async deactivate(companyId: string, id: string) {
    const found = await this.prisma.item.findFirst({
      where: { id, companyId },
    });
    if (!found) throw new NotFoundException('Item not found');

    const deactivated = await this.prisma.item.update({
      where: { id },
      data: { isActive: false },
    });
    logger.warn({
      event: 'items.deactivate.success',
      companyId,
      itemId: id,
    });
    return deactivated;
  }

  async activate(companyId: string, id: string) {
    const found = await this.prisma.item.findFirst({
      where: { id, companyId },
    });
    if (!found) throw new NotFoundException('Item not found');

    const activated = await this.prisma.item.update({
      where: { id },
      data: { isActive: true },
    });
    logger.info({
      event: 'items.activate.success',
      companyId,
      itemId: id,
    });
    return activated;
  }
}
