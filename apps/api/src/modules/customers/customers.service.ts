import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  create(companyId: string, dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: {
        companyId,
        customerName: dto.customerName.trim(),
        customerAddress: dto.customerAddress.trim(),
        postalCode: dto.postalCode?.trim() || null,
        city: dto.city?.trim() || null,
        state: dto.state?.trim() || null,
        country: dto.country?.trim() || null,
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
        customerName: dto.customerName?.trim(),
        customerAddress: dto.customerAddress?.trim(),
        postalCode: dto.postalCode?.trim(),
        city: dto.city?.trim(),
        state: dto.state?.trim(),
        country: dto.country?.trim(),
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
