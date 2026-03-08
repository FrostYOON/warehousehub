import { Test, TestingModule } from '@nestjs/testing';
import {
  InboundUploadStatus,
  OutboundStatus,
  ReturnStatus,
  Role,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DASHBOARD_OUTBOUND_IN_PROGRESS_STATUSES,
  DASHBOARD_OUTBOUND_OVERDUE_STATUSES,
  DASHBOARD_RETURNS_TODAY_STATUSES,
  DashboardService,
} from './dashboard.service';
import {
  DashboardAnalyticsRange,
  DashboardSegmentBy,
} from './dto/dashboard-summary-query.dto';

describe('DashboardService', () => {
  let service: DashboardService;

  const prismaMock = {
    item: { count: jest.fn() },
    inboundUpload: { count: jest.fn() },
    outboundOrder: { count: jest.fn() },
    returnReceipt: { count: jest.fn() },
    user: { count: jest.fn() },
    stock: { groupBy: jest.fn() },
    lot: { count: jest.fn() },
    outboundLine: { findMany: jest.fn() },
    returnReceiptLine: { findMany: jest.fn() },
    pickAllocation: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.outboundLine.findMany.mockResolvedValue([]);
    prismaMock.returnReceiptLine.findMany.mockResolvedValue([]);
    prismaMock.pickAllocation.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('집계 기준 상태로 KPI/알림을 계산한다', async () => {
    prismaMock.item.count.mockResolvedValueOnce(123);
    prismaMock.inboundUpload.count.mockResolvedValueOnce(7);
    prismaMock.outboundOrder.count.mockResolvedValueOnce(11);
    prismaMock.returnReceipt.count.mockResolvedValueOnce(5);
    prismaMock.user.count.mockResolvedValueOnce(2);
    prismaMock.outboundOrder.count.mockResolvedValueOnce(3);
    prismaMock.stock.groupBy.mockResolvedValueOnce([]);
    prismaMock.lot.count.mockResolvedValueOnce(0);
    prismaMock.inboundUpload.count.mockResolvedValueOnce(3);
    prismaMock.outboundOrder.count.mockResolvedValueOnce(4);
    prismaMock.returnReceipt.count.mockResolvedValueOnce(6);
    const result = await service.summary(
      'c-1',
      Role.ADMIN,
      DashboardAnalyticsRange.QUARTER,
      DashboardSegmentBy.WAREHOUSE_TYPE,
      2,
    );

    expect(result.asOf).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(result.asOf))).toBe(false);
    expect(result.kpis).toEqual({
      totalItems: 123,
      inboundPending: 7,
      outboundInProgress: 11,
      returnsToday: 5,
      approvalPending: 2,
      outboundCompletedToday: 3,
      stockShortageCount: 0,
    });
    expect(result.alerts.map((a) => a.id)).toEqual([
      'outbound-overdue',
      'inbound-invalid-pending',
      'returns-decided-pending',
    ]);
    expect(result.alerts.map((a) => a.level)).toEqual([
      'critical',
      'warning',
      'info',
    ]);
    expect(result.analysis.range).toBe('QUARTER');
  });

  it('역할별 todo를 분리한다', async () => {
    prismaMock.stock.groupBy.mockResolvedValue([]);
    prismaMock.lot.count.mockResolvedValue(0);
    prismaMock.item.count.mockResolvedValueOnce(1);
    prismaMock.inboundUpload.count.mockResolvedValueOnce(2);
    prismaMock.outboundOrder.count.mockResolvedValueOnce(3);
    prismaMock.returnReceipt.count.mockResolvedValueOnce(4);
    prismaMock.user.count.mockResolvedValueOnce(5);
    prismaMock.outboundOrder.count.mockResolvedValueOnce(0);
    prismaMock.inboundUpload.count.mockResolvedValueOnce(0);
    prismaMock.outboundOrder.count.mockResolvedValueOnce(0);
    prismaMock.returnReceipt.count.mockResolvedValueOnce(6);
    const admin = await service.summary(
      'c-1',
      Role.ADMIN,
      DashboardAnalyticsRange.QUARTER,
      DashboardSegmentBy.WAREHOUSE_TYPE,
      2,
    );
    expect(admin.todos.map((todo) => todo.id)).toEqual([
      'todo-inbound-confirm',
      'todo-returns-decide',
      'todo-outbound-shipping',
      'todo-approvals',
    ]);

    prismaMock.item.count.mockResolvedValueOnce(1);
    prismaMock.inboundUpload.count.mockResolvedValueOnce(2);
    prismaMock.outboundOrder.count.mockResolvedValueOnce(3);
    prismaMock.returnReceipt.count.mockResolvedValueOnce(4);
    prismaMock.user.count.mockResolvedValueOnce(5);
    prismaMock.outboundOrder.count.mockResolvedValueOnce(0);
    prismaMock.inboundUpload.count.mockResolvedValueOnce(0);
    prismaMock.outboundOrder.count.mockResolvedValueOnce(0);
    prismaMock.returnReceipt.count.mockResolvedValueOnce(6);
    const sales = await service.summary(
      'c-1',
      Role.SALES,
      DashboardAnalyticsRange.QUARTER,
      DashboardSegmentBy.WAREHOUSE_TYPE,
      2,
    );
    expect(sales.todos).toEqual([]);
  });

  it('쿼리에서 집계 상태 상수를 사용한다', async () => {
    prismaMock.item.count.mockResolvedValueOnce(0);
    prismaMock.inboundUpload.count.mockResolvedValueOnce(0);
    prismaMock.outboundOrder.count.mockResolvedValueOnce(0);
    prismaMock.returnReceipt.count.mockResolvedValueOnce(0);
    prismaMock.user.count.mockResolvedValueOnce(0);
    prismaMock.outboundOrder.count.mockResolvedValueOnce(0);
    prismaMock.stock.groupBy.mockResolvedValueOnce([]);
    prismaMock.lot.count.mockResolvedValueOnce(0);
    prismaMock.inboundUpload.count.mockResolvedValueOnce(0);
    prismaMock.outboundOrder.count.mockResolvedValueOnce(0);
    prismaMock.returnReceipt.count.mockResolvedValueOnce(0);
    await service.summary(
      'c-1',
      Role.ADMIN,
      DashboardAnalyticsRange.QUARTER,
      DashboardSegmentBy.WAREHOUSE_TYPE,
      2,
    );

    expect(prismaMock.inboundUpload.count).toHaveBeenNthCalledWith(1, {
      where: { companyId: 'c-1', status: InboundUploadStatus.UPLOADED },
    });
    expect(prismaMock.outboundOrder.count).toHaveBeenNthCalledWith(1, {
      where: {
        companyId: 'c-1',
        status: { in: DASHBOARD_OUTBOUND_IN_PROGRESS_STATUSES },
      },
    });
    expect(prismaMock.returnReceipt.count).toHaveBeenNthCalledWith(1, {
      where: {
        companyId: 'c-1',
        createdAt: { gte: expect.any(Date) },
        status: { in: DASHBOARD_RETURNS_TODAY_STATUSES },
      },
    });
    expect(prismaMock.outboundOrder.count).toHaveBeenNthCalledWith(2, {
      where: {
        companyId: 'c-1',
        status: OutboundStatus.DELIVERED,
        deliveredAt: expect.any(Object),
      },
    });
    expect(prismaMock.outboundOrder.count).toHaveBeenNthCalledWith(3, {
      where: {
        companyId: 'c-1',
        plannedDate: { lt: expect.any(Date) },
        status: { in: DASHBOARD_OUTBOUND_OVERDUE_STATUSES },
      },
    });
    expect(prismaMock.returnReceipt.count).toHaveBeenNthCalledWith(2, {
      where: {
        companyId: 'c-1',
        status: ReturnStatus.DECIDED,
        lines: { some: { processedAt: null } },
      },
    });
  });

  it('임계치 미만 알림은 노출하지 않는다', async () => {
    prismaMock.item.count.mockResolvedValueOnce(0);
    prismaMock.inboundUpload.count.mockResolvedValueOnce(0);
    prismaMock.outboundOrder.count.mockResolvedValueOnce(0);
    prismaMock.returnReceipt.count.mockResolvedValueOnce(0);
    prismaMock.user.count.mockResolvedValueOnce(0);
    prismaMock.outboundOrder.count.mockResolvedValueOnce(0);
    prismaMock.stock.groupBy.mockResolvedValueOnce([]);
    prismaMock.lot.count.mockResolvedValueOnce(0);
    prismaMock.inboundUpload.count.mockResolvedValueOnce(1);
    prismaMock.outboundOrder.count.mockResolvedValueOnce(1);
    prismaMock.returnReceipt.count.mockResolvedValueOnce(1);
    const result = await service.summary(
      'c-1',
      Role.ADMIN,
      DashboardAnalyticsRange.QUARTER,
      DashboardSegmentBy.WAREHOUSE_TYPE,
      2,
    );
    expect(result.alerts.map((alert) => alert.id)).toEqual([
      'outbound-overdue',
      'inbound-invalid-pending',
    ]);
  });

  it('분석 데이터 top 리스트를 계산한다', async () => {
    prismaMock.item.count.mockResolvedValueOnce(0);
    prismaMock.inboundUpload.count.mockResolvedValueOnce(0);
    prismaMock.outboundOrder.count.mockResolvedValueOnce(0);
    prismaMock.returnReceipt.count.mockResolvedValueOnce(0);
    prismaMock.user.count.mockResolvedValueOnce(0);
    prismaMock.outboundOrder.count.mockResolvedValueOnce(0);
    prismaMock.stock.groupBy.mockResolvedValueOnce([]);
    prismaMock.lot.count.mockResolvedValueOnce(0);
    prismaMock.inboundUpload.count.mockResolvedValueOnce(0);
    prismaMock.outboundOrder.count.mockResolvedValueOnce(0);
    prismaMock.returnReceipt.count.mockResolvedValueOnce(0);
    prismaMock.outboundLine.findMany
      .mockResolvedValueOnce([
        {
          itemId: 'i1',
          deliveredQty: { toString: () => '10' },
          item: { itemCode: 'A001', itemName: '품목1' },
          order: { deliveredAt: new Date('2026-01-01T00:00:00.000Z') },
        },
        {
          itemId: 'i2',
          deliveredQty: { toString: () => '5' },
          item: { itemCode: 'A002', itemName: '품목2' },
          order: { deliveredAt: new Date('2026-01-02T00:00:00.000Z') },
        },
      ])
      .mockResolvedValueOnce([]) // previous window
      .mockResolvedValueOnce([
        {
          deliveredQty: { toString: () => '10' },
          order: { customerId: 'c1', customer: { customerName: '고객사1' } },
        },
      ]);
    prismaMock.returnReceiptLine.findMany
      .mockResolvedValueOnce([
        {
          itemId: 'i1',
          qty: { toString: () => '2' },
          item: { itemCode: 'A001', itemName: '품목1' },
          processedAt: new Date('2026-01-03T00:00:00.000Z'),
        },
        {
          itemId: 'i2',
          qty: { toString: () => '1' },
          item: { itemCode: 'A002', itemName: '품목2' },
          processedAt: new Date('2026-01-04T00:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          qty: { toString: () => '1' },
          receipt: { customerId: 'c1', customer: { customerName: '고객사1' } },
        },
      ])
      .mockResolvedValueOnce([
        {
          qty: { toString: () => '1' },
          storageType: 'DRY',
        },
      ]);
    prismaMock.pickAllocation.findMany.mockResolvedValueOnce([
      {
        qty: { toString: () => '5' },
        warehouse: { type: 'DRY' },
      },
    ]);

    const result = await service.summary(
      'c-1',
      Role.ADMIN,
      DashboardAnalyticsRange.WEEK,
      DashboardSegmentBy.CUSTOMER,
      2,
    );
    expect(result.analysis.topOutboundItems[0].itemId).toBe('i1');
    expect(result.analysis.worstOutboundItems[0].itemId).toBe('i2');
    expect(result.analysis.topReturnRateItems[0].itemId).toBe('i1');
    expect(result.analysis.topReturnRateItems[0].returnRate).toBe(20);
    expect(result.analysis.segmentComparison[0].key).toBe('c1');
  });
});
