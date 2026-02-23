import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

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

  create(companyId: string, dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: {
        companyId,
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
  }

  list(companyId: string, q?: string) {
    return this.prisma.customer.findMany({
      where: {
        companyId,
        isActive: true,
        ...(q
          ? {
              OR: [
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

    return this.prisma.customer.update({
      where: { id },
      data: {
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
  }

  async deactivate(companyId: string, id: string) {
    const found = await this.prisma.customer.findFirst({
      where: { id, companyId },
    });
    if (!found) throw new NotFoundException('Customer not found');

    return this.prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
