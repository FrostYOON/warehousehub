import { Test, TestingModule } from '@nestjs/testing';
import { ReturnsController } from './returns.controller';
import { ReturnsService } from './returns.service';

describe('ReturnsController', () => {
  let controller: ReturnsController;
  const returnsServiceMock = {
    create: jest.fn(),
    list: jest.fn(),
    detail: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn(),
    decide: jest.fn(),
    process: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReturnsController],
      providers: [{ provide: ReturnsService, useValue: returnsServiceMock }],
    }).compile();

    controller = module.get<ReturnsController>(ReturnsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
