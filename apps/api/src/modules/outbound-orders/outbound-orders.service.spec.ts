import { Test, TestingModule } from '@nestjs/testing';
import { OutboundOrdersService } from './outbound-orders.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OutboundPickingService } from '../outbound-picking/outbound-picking.service';

describe('OutboundOrdersService', () => {
  let service: OutboundOrdersService;
  const prismaMock = {};
  const outboundPickingServiceMock = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboundOrdersService,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: OutboundPickingService,
          useValue: outboundPickingServiceMock,
        },
      ],
    }).compile();

    service = module.get<OutboundOrdersService>(OutboundOrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
