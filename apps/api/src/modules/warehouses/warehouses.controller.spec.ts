import { Test, TestingModule } from '@nestjs/testing';
import { WarehousesController } from './warehouses.controller';
import { WarehousesService } from './warehouses.service';

describe('WarehousesController', () => {
  let controller: WarehousesController;
  const warehousesServiceMock = {
    list: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WarehousesController],
      providers: [
        { provide: WarehousesService, useValue: warehousesServiceMock },
      ],
    }).compile();

    controller = module.get<WarehousesController>(WarehousesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
