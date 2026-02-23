import { Test, TestingModule } from '@nestjs/testing';
import { InboundController } from './inbound.controller';
import { InboundService } from './inbound.service';

describe('InboundController', () => {
  let controller: InboundController;
  const inboundServiceMock = {
    createUpload: jest.fn(),
    getUpload: jest.fn(),
    confirmUpload: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InboundController],
      providers: [{ provide: InboundService, useValue: inboundServiceMock }],
    }).compile();

    controller = module.get<InboundController>(InboundController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
