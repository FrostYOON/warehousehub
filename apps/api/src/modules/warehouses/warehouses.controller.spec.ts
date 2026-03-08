import { Test, TestingModule } from '@nestjs/testing';
import { WarehousesController } from './warehouses.controller';
import { WarehousesService } from './warehouses.service';
import { UserBranchAccessService } from '../users/user-branch-access.service';

describe('WarehousesController', () => {
  let controller: WarehousesController;
  const warehousesServiceMock = {
    list: jest.fn(),
  };
  const userBranchAccessMock = {
    getUserBranchIds: jest.fn().mockResolvedValue(null),
  };

  beforeEach(async () => {
    userBranchAccessMock.getUserBranchIds.mockResolvedValue(null);
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WarehousesController],
      providers: [
        { provide: WarehousesService, useValue: warehousesServiceMock },
        {
          provide: UserBranchAccessService,
          useValue: userBranchAccessMock,
        },
      ],
    }).compile();

    controller = module.get<WarehousesController>(WarehousesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
