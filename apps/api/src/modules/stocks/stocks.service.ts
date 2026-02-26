import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageType } from '@prisma/client';

@Injectable()
export class StocksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: {
    companyId: string;
    storageType?: StorageType;
    itemCode?: string;
  }) {
    const { companyId, storageType, itemCode } = params;
    const normalizedItemCode = itemCode?.trim() || undefined;

    const rows = await this.prisma.stock.findMany({
      where: {
        companyId,
        warehouse: storageType ? { type: storageType } : undefined,
        lot: normalizedItemCode
          ? { item: { itemCode: normalizedItemCode } }
          : undefined,
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

    return rows.map((row) => ({
      ...row,
      onHand: Number(row.onHand.toString()),
      reserved: Number(row.reserved.toString()),
    }));
  }
}
