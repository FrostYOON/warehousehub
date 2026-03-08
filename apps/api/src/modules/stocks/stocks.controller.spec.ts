import { Test, TestingModule } from '@nestjs/testing';
import { StocksController } from './stocks.controller';
import { StocksService } from './stocks.service';
import { StorageType } from '@prisma/client';

describe('StocksController', () => {
  let controller: StocksController;
  const stocksServiceMock = {
    list: jest.fn(),
    listItems: jest.fn(),
    itemTrend: jest.fn(),
    updateStock: jest.fn(),
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
    const query = {
      storageType: StorageType.DRY,
      itemCode: 'A001',
      page: 2,
      pageSize: 20,
    };
    stocksServiceMock.list.mockResolvedValueOnce([]);

    await controller.list(req, query);

    expect(stocksServiceMock.list).toHaveBeenCalledWith({
      companyId: 'company-1',
      storageType: StorageType.DRY,
      itemCode: 'A001',
      page: 2,
      pageSize: 20,
    });
  });

  it('forwards item list query to service', async () => {
    const req = { user: { companyId: 'company-1' } } as never;
    stocksServiceMock.listItems.mockResolvedValueOnce([]);

    await controller.listItems(req, { keyword: 'A00' });

    expect(stocksServiceMock.listItems).toHaveBeenCalledWith(
      'company-1',
      'A00',
    );
  });

  it('forwards item trend query to service', async () => {
    const req = { user: { companyId: 'company-1' } } as never;
    stocksServiceMock.itemTrend.mockResolvedValueOnce(null);

    await controller.itemTrend(req, 'item-1', { range: 'WEEK' as const });

    expect(stocksServiceMock.itemTrend).toHaveBeenCalledWith({
      companyId: 'company-1',
      itemId: 'item-1',
      range: 'WEEK',
    });
  });

  it('forwards stock update payload to service', async () => {
    const req = { user: { companyId: 'company-1', userId: 'user-1' } } as never;
    stocksServiceMock.updateStock.mockResolvedValueOnce(null);

    await controller.updateStock(req, 'stock-1', {
      onHand: 10.5,
      reserved: 2,
      memo: '실사 보정',
    });

    expect(stocksServiceMock.updateStock).toHaveBeenCalledWith({
      companyId: 'company-1',
      actorUserId: 'user-1',
      stockId: 'stock-1',
      onHand: 10.5,
      reserved: 2,
      memo: '실사 보정',
    });
  });
});
