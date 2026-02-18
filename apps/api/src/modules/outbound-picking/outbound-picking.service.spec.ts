import { Test, TestingModule } from '@nestjs/testing';
import { OutboundPickingService } from './outbound-picking.service';

describe('OutboundPickingService', () => {
  let service: OutboundPickingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OutboundPickingService],
    }).compile();

    service = module.get<OutboundPickingService>(OutboundPickingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
