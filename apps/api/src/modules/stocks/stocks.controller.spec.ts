import { Test, TestingModule } from '@nestjs/testing';
import { StocksController } from './stocks.controller';
import { StocksService } from './stocks.service';
import { StorageType } from '@prisma/client';

describe('StocksController', () => {
  let controller: StocksController;
  const stocksServiceMock = {
    list: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StocksController],
      providers: [{ provide: StocksService, useValue: stocksServiceMock }],
    }).compile();

    controller = module.get<StocksController>(StocksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('forwards companyId and query filters to service', async () => {
    const req = { user: { companyId: 'company-1' } } as never;
    const query = { storageType: StorageType.DRY, itemCode: 'A001' };
    stocksServiceMock.list.mockResolvedValueOnce([]);

    await controller.list(req, query);

    expect(stocksServiceMock.list).toHaveBeenCalledWith({
      companyId: 'company-1',
      storageType: StorageType.DRY,
      itemCode: 'A001',
    });
  });
});
