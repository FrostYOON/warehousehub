import { Test, TestingModule } from '@nestjs/testing';
import { OutboundPickingController } from './outbound-picking.controller';
import { OutboundPickingService } from './outbound-picking.service';

describe('OutboundPickingController', () => {
  let controller: OutboundPickingController;
  const outboundPickingServiceMock = {
    reserveForOrder: jest.fn(),
    submit: jest.fn(),
    manualPick: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OutboundPickingController],
      providers: [
        {
          provide: OutboundPickingService,
          useValue: outboundPickingServiceMock,
        },
      ],
    }).compile();

    controller = module.get<OutboundPickingController>(
      OutboundPickingController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
