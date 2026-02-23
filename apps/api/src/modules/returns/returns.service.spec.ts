import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { ReturnsService } from './returns.service';

describe('ReturnsService', () => {
  let service: ReturnsService;
  const prismaMock = {
    customer: { findFirst: jest.fn() },
    item: { findMany: jest.fn() },
    returnReceipt: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    returnReceiptLine: {
      update: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    inventoryTx: { create: jest.fn() },
    inventoryTxLine: { create: jest.fn() },
    warehouse: { findFirst: jest.fn() },
    lot: { findFirst: jest.fn(), create: jest.fn(), upsert: jest.fn() },
    stock: { upsert: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReturnsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ReturnsService>(ReturnsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
