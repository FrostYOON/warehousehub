import { Test, TestingModule } from '@nestjs/testing';
import { OutboundPickingService } from './outbound-picking.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('OutboundPickingService', () => {
  let service: OutboundPickingService;
  const prismaMock = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboundPickingService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<OutboundPickingService>(OutboundPickingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
