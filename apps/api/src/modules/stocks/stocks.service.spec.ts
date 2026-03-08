import { Test, TestingModule } from '@nestjs/testing';
import { StocksService } from './stocks.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageType } from '@prisma/client';

describe('StocksService', () => {
  let service: StocksService;
  const prismaMock = {
    stock: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    item: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    outboundLine: {
      findMany: jest.fn(),
    },
    returnReceiptLine: {
      findMany: jest.fn(),
    },
    inventoryTx: {
      create: jest.fn(),
    },
    inventoryTxLine: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
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
    prismaMock.stock.count.mockResolvedValueOnce(0);

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
    prismaMock.stock.count.mockResolvedValueOnce(0);

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
    prismaMock.stock.count.mockResolvedValueOnce(0);

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

  it('returns item analytics trend buckets and totals', async () => {
    const now = new Date();
    const deliveredAt = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const processedAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    prismaMock.item.findFirst.mockResolvedValueOnce({
      id: 'item-1',
      itemCode: 'A001',
      itemName: '테스트 품목',
    });
    prismaMock.outboundLine.findMany.mockResolvedValueOnce([
      {
        deliveredQty: { toString: () => '10.5' },
        order: { deliveredAt },
      },
    ]);
    prismaMock.returnReceiptLine.findMany.mockResolvedValueOnce([
      {
        qty: { toString: () => '1.5' },
        processedAt,
      },
    ]);

    const result = await service.itemTrend({
      companyId: 'company-1',
      itemId: 'item-1',
      range: 'WEEK',
    });

    expect(result.item?.id).toBe('item-1');
    expect(result.range).toBe('WEEK');
    expect(result.buckets.length).toBe(12);
    expect(result.totals.outboundQty).toBe(10.5);
    expect(result.totals.returnQty).toBe(1.5);
    expect(result.totals.returnRate).toBeCloseTo(14.29, 2);
  });

  it('updates stock for admin manual adjustment', async () => {
    prismaMock.stock.findFirst
      .mockResolvedValueOnce({
        id: 'stock-1',
        warehouseId: 'wh-1',
        lotId: 'lot-1',
        onHand: { toString: () => '5' },
      })
      .mockResolvedValueOnce({
        id: 'stock-1',
        onHand: { toString: () => '12.5' },
        reserved: { toString: () => '2' },
        updatedAt: new Date(),
        warehouse: { id: 'wh-1', type: 'DRY', name: 'DRY-1' },
        lot: {
          id: 'lot-1',
          expiryDate: null,
          item: { id: 'item-1', itemCode: 'A001', itemName: '테스트' },
        },
      });
    prismaMock.inventoryTx.create.mockResolvedValueOnce({ id: 'tx-1' });
    prismaMock.$transaction.mockImplementationOnce(async (callback) =>
      callback(prismaMock),
    );

    const result = await service.updateStock({
      companyId: 'company-1',
      actorUserId: 'user-1',
      stockId: 'stock-1',
      onHand: 12.5,
      reserved: 2,
      memo: '실사 보정',
    });

    expect(prismaMock.stock.update).toHaveBeenCalled();
    expect(prismaMock.inventoryTx.create).toHaveBeenCalled();
    expect(result.onHand).toBe(12.5);
    expect(result.reserved).toBe(2);
  });

  it('allows reserved greater than onHand', async () => {
    prismaMock.stock.findFirst
      .mockResolvedValueOnce({
        id: 'stock-1',
        warehouseId: 'wh-1',
        lotId: 'lot-1',
        onHand: { toString: () => '4' },
      })
      .mockResolvedValueOnce({
        id: 'stock-1',
        onHand: { toString: () => '4' },
        reserved: { toString: () => '5' },
        updatedAt: new Date(),
        warehouse: { id: 'wh-1', type: 'DRY', name: 'DRY-1' },
        lot: {
          id: 'lot-1',
          expiryDate: null,
          item: { id: 'item-1', itemCode: 'A001', itemName: '테스트' },
        },
      });
    prismaMock.inventoryTx.create.mockResolvedValueOnce({ id: 'tx-1' });
    prismaMock.$transaction.mockImplementationOnce(async (callback) =>
      callback(prismaMock),
    );

    const result = await service.updateStock({
      companyId: 'company-1',
      actorUserId: 'user-1',
      stockId: 'stock-1',
      onHand: 4,
      reserved: 5,
    });

    expect(result.reserved).toBe(5);
  });
});
