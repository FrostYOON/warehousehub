import { Test, TestingModule } from '@nestjs/testing';
import { InboundService } from './inbound.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('InboundService', () => {
  let service: InboundService;
  const prismaMock = {
    inboundUpload: {
      create: jest.fn(),
      findFirst: jest.fn(),
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
});
