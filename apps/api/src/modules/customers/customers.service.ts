import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { getModuleLogger } from '../../common/logging/module-logger';

const logger = getModuleLogger('CustomersService');

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeRequiredString(value: string, field: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new BadRequestException(`${field} is required`);
    }
    return trimmed;
  }

  private normalizeOptionalStringForCreate(value?: string): string | null {
    if (value === undefined) return null;
    const trimmed = value.trim();
    return trimmed || null;
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

  async create(companyId: string, dto: CreateCustomerDto) {
    try {
      return await this.prisma.customer.create({
        data: {
          companyId,
          customerCode: this.normalizeOptionalStringForCreate(dto.customerCode),
          customerName: this.normalizeRequiredString(
            dto.customerName,
            'customerName',
          ),
          customerAddress: this.normalizeRequiredString(
            dto.customerAddress,
            'customerAddress',
          ),
          postalCode: this.normalizeOptionalStringForCreate(dto.postalCode),
          city: this.normalizeOptionalStringForCreate(dto.city),
          state: this.normalizeOptionalStringForCreate(dto.state),
          country: this.normalizeOptionalStringForCreate(dto.country),
          lat: dto.lat ?? null,
          lng: dto.lng ?? null,
        },
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          '같은 회사 내에 동일한 고객사명이 이미 등록되어 있습니다.',
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
              { customerCode: { contains: q, mode: Prisma.QueryMode.insensitive } },
              { customerName: { contains: q, mode: Prisma.QueryMode.insensitive } },
              { customerAddress: { contains: q, mode: Prisma.QueryMode.insensitive } },
              { city: { contains: q, mode: Prisma.QueryMode.insensitive } },
              { state: { contains: q, mode: Prisma.QueryMode.insensitive } },
              { postalCode: { contains: q, mode: Prisma.QueryMode.insensitive } },
              { country: { contains: q, mode: Prisma.QueryMode.insensitive } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        orderBy: { customerName: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { total, page, pageSize, items };
  }

  async findById(companyId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, companyId },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async update(companyId: string, id: string, dto: UpdateCustomerDto) {
    const found = await this.prisma.customer.findFirst({
      where: { id, companyId },
    });
    if (!found) throw new NotFoundException('Customer not found');

    try {
      const updated = await this.prisma.customer.update({
        where: { id },
        data: {
          customerCode: this.normalizeOptionalStringForUpdate(dto.customerCode),
          customerName: this.normalizeRequiredStringForUpdate(
            dto.customerName,
            'customerName',
          ),
          customerAddress: this.normalizeRequiredStringForUpdate(
            dto.customerAddress,
            'customerAddress',
          ),
          postalCode: this.normalizeOptionalStringForUpdate(dto.postalCode),
          city: this.normalizeOptionalStringForUpdate(dto.city),
          state: this.normalizeOptionalStringForUpdate(dto.state),
          country: this.normalizeOptionalStringForUpdate(dto.country),
          lat: dto.lat,
          lng: dto.lng,
        },
      });
      logger.info({
        event: 'customers.update.success',
        companyId,
        customerId: id,
      });
      return updated;
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          '같은 회사 내에 동일한 고객사명이 이미 등록되어 있습니다.',
        );
      }
      throw error;
    }
  }

  async deactivate(companyId: string, id: string) {
    const found = await this.prisma.customer.findFirst({
      where: { id, companyId },
    });
    if (!found) throw new NotFoundException('Customer not found');

    const deactivated = await this.prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });
    logger.warn({
      event: 'customers.deactivate.success',
      companyId,
      customerId: id,
    });
    return deactivated;
  }

  async activate(companyId: string, id: string) {
    const found = await this.prisma.customer.findFirst({
      where: { id, companyId },
    });
    if (!found) throw new NotFoundException('Customer not found');

    const activated = await this.prisma.customer.update({
      where: { id },
      data: { isActive: true },
    });
    logger.info({
      event: 'customers.activate.success',
      companyId,
      customerId: id,
    });
    return activated;
  }
}
