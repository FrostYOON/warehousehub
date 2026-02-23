import { Test, TestingModule } from '@nestjs/testing';
import { OutboundShippingService } from './outbound-shipping.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('OutboundShippingService', () => {
  let service: OutboundShippingService;
  const prismaMock = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboundShippingService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<OutboundShippingService>(OutboundShippingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
