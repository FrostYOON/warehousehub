import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string) {
    return this.prisma.warehouse.findMany({
      where: { companyId },
      orderBy: [{ branch: { name: 'asc' } }, { type: 'asc' }, { region: 'asc' }],
      select: {
        id: true,
        type: true,
        name: true,
        region: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
