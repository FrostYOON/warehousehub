import { Test, TestingModule } from '@nestjs/testing';
import { OutboundOrdersController } from './outbound-orders.controller';
import { OutboundOrdersService } from './outbound-orders.service';

describe('OutboundOrdersController', () => {
  let controller: OutboundOrdersController;
  const outboundOrdersServiceMock = {
    create: jest.fn(),
    list: jest.fn(),
    detail: jest.fn(),
    cancelOrder: jest.fn(),
    cancelLine: jest.fn(),
    updateLine: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OutboundOrdersController],
      providers: [
        { provide: OutboundOrdersService, useValue: outboundOrdersServiceMock },
      ],
    }).compile();

    controller = module.get<OutboundOrdersController>(OutboundOrdersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
