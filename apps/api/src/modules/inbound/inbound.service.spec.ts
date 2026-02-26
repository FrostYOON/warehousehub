import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { InboundService } from './inbound.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('InboundService', () => {
  let service: InboundService;
  const prismaMock = {
    inboundUpload: {
      create: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    inventoryTx: { create: jest.fn() },
    inventoryTxLine: { create: jest.fn() },
    item: { upsert: jest.fn() },
    lot: { findFirst: jest.fn(), create: jest.fn(), upsert: jest.fn() },
    warehouse: { findFirst: jest.fn() },
    stock: { upsert: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InboundService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<InboundService>(InboundService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('confirmUpload', () => {
    it('claims upload in transaction and confirms stock movement', async () => {
      prismaMock.inboundUpload.findFirst.mockResolvedValueOnce({
        id: 'upload-1',
        status: 'UPLOADED',
        rows: [
          {
            itemCode: 'ITEM-1',
            itemName: 'Item One',
            storageType: 'DRY',
            quantity: 10,
            expiryDate: null,
            isValid: true,
          },
        ],
      });
      prismaMock.inboundUpload.updateMany.mockResolvedValueOnce({ count: 1 });
      prismaMock.inventoryTx.create.mockResolvedValueOnce({ id: 'tx-1' });
      prismaMock.item.upsert.mockResolvedValueOnce({ id: 'item-1' });
      prismaMock.lot.findFirst.mockResolvedValueOnce({ id: 'lot-1' });
      prismaMock.warehouse.findFirst.mockResolvedValueOnce({ id: 'wh-1' });
      prismaMock.stock.upsert.mockResolvedValueOnce({});
      prismaMock.inventoryTxLine.create.mockResolvedValueOnce({});
      prismaMock.$transaction.mockImplementationOnce(
        async (cb: (tx: typeof prismaMock) => Promise<{ ok: true }>) =>
          cb(prismaMock),
      );

      const result = await service.confirmUpload({
        companyId: 'company-1',
        uploadId: 'upload-1',
        actorUserId: 'user-1',
      });

      expect(prismaMock.inboundUpload.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'upload-1',
            companyId: 'company-1',
            status: 'UPLOADED',
          },
        }),
      );
      expect(prismaMock.stock.upsert).toHaveBeenCalledTimes(1);
      expect(prismaMock.inboundUpload.update).not.toHaveBeenCalled();
      expect(result).toEqual({ ok: true });
    });

    it('throws when upload is already claimed by another request', async () => {
      prismaMock.inboundUpload.findFirst.mockResolvedValueOnce({
        id: 'upload-1',
        status: 'UPLOADED',
        rows: [
          {
            itemCode: 'ITEM-1',
            itemName: 'Item One',
            storageType: 'DRY',
            quantity: 10,
            expiryDate: null,
            isValid: true,
          },
        ],
      });
      prismaMock.inboundUpload.updateMany.mockResolvedValueOnce({ count: 0 });
      prismaMock.$transaction.mockImplementationOnce(
        async (cb: (tx: typeof prismaMock) => Promise<{ ok: true }>) =>
          cb(prismaMock),
      );

      await expect(
        service.confirmUpload({
          companyId: 'company-1',
          uploadId: 'upload-1',
          actorUserId: 'user-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
