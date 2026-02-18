import { Test, TestingModule } from '@nestjs/testing';
import { OutboundShippingService } from './outbound-shipping.service';

describe('OutboundShippingService', () => {
  let service: OutboundShippingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OutboundShippingService],
    }).compile();

    service = module.get<OutboundShippingService>(OutboundShippingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
