import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string) {
    return this.prisma.warehouse.findMany({
      where: { companyId },
      orderBy: [{ type: 'asc' }, { region: 'asc' }],
      select: {
        id: true,
        type: true,
        name: true,
        region: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
