import { Test, TestingModule } from '@nestjs/testing';
import { StocksService } from './stocks.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('StocksService', () => {
  let service: StocksService;
  const prismaMock = {};

  beforeEach(async () => {
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
});
