import { Test, TestingModule } from '@nestjs/testing';
import { OutboundShippingController } from './outbound-shipping.controller';
import { OutboundShippingService } from './outbound-shipping.service';

describe('OutboundShippingController', () => {
  let controller: OutboundShippingController;
  const outboundShippingServiceMock = {
    verify: jest.fn(),
    start: jest.fn(),
    complete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OutboundShippingController],
      providers: [
        {
          provide: OutboundShippingService,
          useValue: outboundShippingServiceMock,
        },
      ],
    }).compile();

    controller = module.get<OutboundShippingController>(
      OutboundShippingController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
