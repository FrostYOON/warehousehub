import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { DashboardAnalyticsRange, DashboardSegmentBy } from './dto/dashboard-summary-query.dto';

describe('DashboardController', () => {
  let controller: DashboardController;
  const dashboardServiceMock = {
    summary: jest.fn(),
  };

  const mockUser = {
    userId: 'user-1',
    companyId: 'company-1',
    role: 'ADMIN' as Role,
  };

  const mockRequest = {
    user: mockUser,
  } as unknown as Request;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [{ provide: DashboardService, useValue: dashboardServiceMock }],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('summary passes companyId, role and query params to service', async () => {
    const query = {
      range: '30d' as DashboardAnalyticsRange,
      segmentBy: 'customer' as DashboardSegmentBy,
      targetReturnRate: 2,
    };
    dashboardServiceMock.summary.mockResolvedValueOnce({ asOf: '2025-01-01' });

    await controller.summary(mockRequest, query);

    expect(dashboardServiceMock.summary).toHaveBeenCalledWith(
      'company-1',
      'ADMIN',
      '30d',
      'customer',
      2,
    );
  });
});
