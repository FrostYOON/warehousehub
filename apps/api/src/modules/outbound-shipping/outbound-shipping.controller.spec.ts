import { Test, TestingModule } from '@nestjs/testing';
import { OutboundShippingController } from './outbound-shipping.controller';

describe('OutboundShippingController', () => {
  let controller: OutboundShippingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OutboundShippingController],
    }).compile();

    controller = module.get<OutboundShippingController>(OutboundShippingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
