import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

  list(
    companyId: string,
    opts?: { q?: string; includeInactive?: boolean; isActive?: boolean },
  ) {
    const { q, includeInactive, isActive } = opts ?? {};
    const isActiveFilter =
      includeInactive === true
        ? undefined
        : isActive !== undefined
          ? { isActive }
          : { isActive: true };

    return this.prisma.customer.findMany({
      where: {
        companyId,
        ...isActiveFilter,
        ...(q
          ? {
              OR: [
                { customerCode: { contains: q, mode: 'insensitive' } },
                { customerName: { contains: q, mode: 'insensitive' } },
                { customerAddress: { contains: q, mode: 'insensitive' } },
                { city: { contains: q, mode: 'insensitive' } },
                { state: { contains: q, mode: 'insensitive' } },
                { postalCode: { contains: q, mode: 'insensitive' } },
                { country: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { customerName: 'asc' },
    });
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
