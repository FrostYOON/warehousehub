import { Test, TestingModule } from '@nestjs/testing';
import { OutboundPickingController } from './outbound-picking.controller';

describe('OutboundPickingController', () => {
  let controller: OutboundPickingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OutboundPickingController],
    }).compile();

    controller = module.get<OutboundPickingController>(OutboundPickingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
