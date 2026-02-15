import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOutboundOrderDto } from './dto/create-outbound-order.dto';

@Injectable()
export class OutboundService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, userId: string, dto: CreateOutboundOrderDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, companyId },
    });

    if (!customer) throw new NotFoundException('Customer not found');

    return this.prisma.outboundOrder.create({
      data: {
        companyId,
        customerId: dto.customerId,
        plannedDate: new Date(dto.plannedDate),
        memo: dto.memo,
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

  detail(companyId: string, id: string) {
    return this.prisma.outboundOrder.findFirst({
      where: { id, companyId },
      include: {
        customer: true,
        lines: true,
      },
    });
  }
}
