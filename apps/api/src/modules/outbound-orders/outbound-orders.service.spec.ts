import { Test, TestingModule } from '@nestjs/testing';
import { OutboundOrdersService } from './outbound-orders.service';

describe('OutboundOrdersService', () => {
  let service: OutboundOrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OutboundOrdersService],
    }).compile();

    service = module.get<OutboundOrdersService>(OutboundOrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
