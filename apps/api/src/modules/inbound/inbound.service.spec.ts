import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import ExcelJS from 'exceljs';
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
    warehouse: { findFirst: jest.fn(), findMany: jest.fn() },
    stock: { upsert: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
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

  describe('createUpload validation', () => {
    it('accepts headers with extra spaces by normalizing column names', async () => {
      prismaMock.inboundUpload.create.mockResolvedValueOnce({ id: 'upload-1' });
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Sheet1');
      ws.columns = [
        { header: ' ItemCode ', key: ' ItemCode ', width: 12 },
        { header: 'ItemName', key: 'ItemName', width: 12 },
        { header: 'StorageType', key: 'StorageType', width: 12 },
        { header: 'Quantity', key: 'Quantity', width: 10 },
        { header: 'ExpiryDate', key: 'ExpiryDate', width: 12 },
      ];
      ws.addRows([
        { ' ItemCode ': 'A001', ItemName: 'Apple', StorageType: 'DRY', Quantity: 10, ExpiryDate: '-' },
      ]);
      const buffer = (await wb.xlsx.writeBuffer()) as Buffer;

      const result = await service.createUpload({
        companyId: 'company-1',
        userId: 'user-1',
        fileName: 'inbound.xlsx',
        buffer,
      });

      expect(result).toEqual({ id: 'upload-1', invalidCount: 0 });
    });

    it('accepts decimal quantity rows', async () => {
      prismaMock.inboundUpload.create.mockResolvedValueOnce({ id: 'upload-2' });
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Sheet1');
      ws.columns = [
        { header: 'ItemCode', key: 'ItemCode', width: 12 },
        { header: 'ItemName', key: 'ItemName', width: 12 },
        { header: 'StorageType', key: 'StorageType', width: 12 },
        { header: 'Quantity', key: 'Quantity', width: 10 },
        { header: 'ExpiryDate', key: 'ExpiryDate', width: 12 },
      ];
      ws.addRows([
        { ItemCode: 'A001', ItemName: 'Apple', StorageType: 'DRY', Quantity: 10.5, ExpiryDate: '-' },
      ]);
      const buffer = (await wb.xlsx.writeBuffer()) as Buffer;

      const result = await service.createUpload({
        companyId: 'company-1',
        userId: 'user-1',
        fileName: 'inbound.xlsx',
        buffer,
      });

      expect(result).toEqual({ id: 'upload-2', invalidCount: 0 });
      expect(prismaMock.inboundUpload.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            rows: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({
                  quantity: 10.5,
                  isValid: true,
                }),
              ]),
            }),
          }),
        }),
      );
    });
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
      prismaMock.warehouse.findMany.mockResolvedValueOnce([
        { id: 'wh-1', type: 'DRY' },
      ]);
      prismaMock.item.upsert.mockResolvedValueOnce({ id: 'item-1' });
      prismaMock.lot.findFirst.mockResolvedValueOnce({ id: 'lot-1' });
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

    it('merges same expiry date lots by day and creates new lot for different date', async () => {
      prismaMock.inboundUpload.findFirst.mockResolvedValueOnce({
        id: 'upload-1',
        status: 'UPLOADED',
        rows: [
          {
            itemCode: 'ITEM-1',
            itemName: 'Item One',
            storageType: 'DRY',
            quantity: 5,
            expiryDate: new Date('2026-03-10T00:00:00.000Z'),
            isValid: true,
          },
          {
            itemCode: 'ITEM-1',
            itemName: 'Item One',
            storageType: 'DRY',
            quantity: 7,
            expiryDate: new Date('2026-03-11T00:00:00.000Z'),
            isValid: true,
          },
        ],
      });
      prismaMock.inboundUpload.updateMany.mockResolvedValueOnce({ count: 1 });
      prismaMock.inventoryTx.create.mockResolvedValueOnce({ id: 'tx-1' });
      prismaMock.warehouse.findMany.mockResolvedValueOnce([
        { id: 'wh-1', type: 'DRY' },
      ]);
      prismaMock.item.upsert
        .mockResolvedValueOnce({ id: 'item-1' })
        .mockResolvedValueOnce({ id: 'item-1' });
      prismaMock.lot.findFirst
        .mockResolvedValueOnce({ id: 'lot-existing-same-day' }) // first row date exists
        .mockResolvedValueOnce(null); // second row date not exists
      prismaMock.lot.create.mockResolvedValueOnce({ id: 'lot-new-date' });
      prismaMock.stock.upsert.mockResolvedValue({});
      prismaMock.inventoryTxLine.create.mockResolvedValue({});
      prismaMock.$transaction.mockImplementationOnce(
        async (cb: (tx: typeof prismaMock) => Promise<{ ok: true }>) =>
          cb(prismaMock),
      );

      await service.confirmUpload({
        companyId: 'company-1',
        uploadId: 'upload-1',
        actorUserId: 'user-1',
      });

      expect(prismaMock.stock.upsert).toHaveBeenCalledTimes(2);
      expect(prismaMock.lot.create).toHaveBeenCalledTimes(1);
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
