import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageType } from '@prisma/client';

@Injectable()
export class StocksService {
  constructor(private readonly prisma: PrismaService) {}

  list(params: {
    companyId: string;
    storageType?: StorageType;
    itemCode?: string;
  }) {
    const { companyId, storageType, itemCode } = params;

    return this.prisma.stock.findMany({
      where: {
        companyId,
        warehouse: storageType ? { type: storageType } : undefined,
        lot: itemCode ? { item: { itemCode } } : undefined,
      },
      orderBy: [
        {
          warehouse: { type: 'asc' },
        },
        {
          lot: { expiryDate: 'asc' },
        },
      ],
      select: {
        id: true,
        onHand: true,
        reserved: true,
        updatedAt: true,
        warehouse: {
          select: {
            id: true,
            type: true,
            name: true,
          },
        },
        lot: {
          select: {
            id: true,
            expiryDate: true,
            item: {
              select: {
                id: true,
                itemCode: true,
                itemName: true,
              },
            },
          },
        },
      },
    });
  }
}
