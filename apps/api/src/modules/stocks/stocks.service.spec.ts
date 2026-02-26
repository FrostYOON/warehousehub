import { Test, TestingModule } from '@nestjs/testing';
import { StocksService } from './stocks.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageType } from '@prisma/client';

describe('StocksService', () => {
  let service: StocksService;
  const prismaMock = {
    stock: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StocksService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<StocksService>(StocksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('queries stocks by company with no optional filters', async () => {
    prismaMock.stock.findMany.mockResolvedValueOnce([]);

    await service.list({ companyId: 'company-1' });

    expect(prismaMock.stock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: 'company-1',
          warehouse: undefined,
          lot: undefined,
        },
      }),
    );
  });

  it('applies storageType and normalized itemCode filters', async () => {
    prismaMock.stock.findMany.mockResolvedValueOnce([]);

    await service.list({
      companyId: 'company-1',
      storageType: StorageType.COOL,
      itemCode: '  A001  ',
    });

    expect(prismaMock.stock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: 'company-1',
          warehouse: { type: StorageType.COOL },
          lot: { item: { itemCode: 'A001' } },
        },
      }),
    );
  });

  it('ignores itemCode filter when input is blank', async () => {
    prismaMock.stock.findMany.mockResolvedValueOnce([]);

    await service.list({
      companyId: 'company-1',
      itemCode: '   ',
    });

    expect(prismaMock.stock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: 'company-1',
          warehouse: undefined,
          lot: undefined,
        },
      }),
    );
  });
});
