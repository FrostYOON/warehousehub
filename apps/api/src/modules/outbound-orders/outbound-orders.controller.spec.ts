import { Test, TestingModule } from '@nestjs/testing';
import { OutboundOrdersController } from './outbound-orders.controller';

describe('OutboundOrdersController', () => {
  let controller: OutboundOrdersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OutboundOrdersController],
    }).compile();

    controller = module.get<OutboundOrdersController>(OutboundOrdersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
