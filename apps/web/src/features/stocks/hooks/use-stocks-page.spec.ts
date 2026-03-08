import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStocksPageWithOptions } from './use-stocks-page';

const mockShowToast = vi.fn();
const mockGetStocks = vi.fn();
const mockGetStockItems = vi.fn();
const mockGetStockItemTrend = vi.fn();

vi.mock('@/shared/ui/toast/toast-provider', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

vi.mock('@/features/stocks/api/stocks.api', () => ({
  getStocks: (...args: unknown[]) => mockGetStocks(...args),
  getStockItems: (...args: unknown[]) => mockGetStockItems(...args),
  getStockItemTrend: (...args: unknown[]) => mockGetStockItemTrend(...args),
  updateStock: vi.fn(),
  exportStocks: vi.fn(),
}));

const mockStocksResponse = {
  items: [
    {
      id: 's1',
      onHand: 100,
      reserved: 10,
      updatedAt: '2025-01-01T00:00:00Z',
      warehouse: { id: 'w1', type: 'DRY', name: 'DRY' },
      lot: {
        id: 'l1',
        expiryDate: null,
        item: { id: 'i1', itemCode: 'ITEM-001', itemName: '상품 A' },
      },
    },
  ],
  total: 1,
  page: 1,
  pageSize: 50,
  totalPages: 1,
};

describe('useStocksPageWithOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStocks.mockResolvedValue(mockStocksResponse);
    mockGetStockItems.mockResolvedValue([
      { id: 'i1', itemCode: 'ITEM-001', itemName: '상품 A' },
    ]);
    mockGetStockItemTrend.mockResolvedValue({
      item: { id: 'i1', itemCode: 'ITEM-001', itemName: '상품 A' },
      range: 'WEEK',
      buckets: [],
      totals: { outboundQty: 0, returnQty: 0, returnRate: 0 },
      asOf: new Date().toISOString(),
    });
  });

  it('마운트 시 getStocks를 호출한다', async () => {
    renderHook(() => useStocksPageWithOptions());

    await waitFor(() => {
      expect(mockGetStocks).toHaveBeenCalled();
    });
  });

  it('getStocks 성공 시 rows를 설정한다', async () => {
    const { result } = renderHook(() => useStocksPageWithOptions());

    await waitFor(() => {
      expect(result.current.rows).toHaveLength(1);
    });
    expect(result.current.rows[0]?.lot?.item?.itemCode).toBe('ITEM-001');
  });

  it('loadStocks 호출 시 페이징 파라미터로 getStocks를 호출한다', async () => {
    const { result } = renderHook(() => useStocksPageWithOptions());
    await waitFor(() => expect(mockGetStocks).toHaveBeenCalled());

    mockGetStocks.mockClear();
    await act(async () => {
      await result.current.loadStocks({ nextPage: 2 });
    });

    expect(mockGetStocks).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
      }),
    );
  });

  it('getStocks 실패 시 toast로 에러 메시지를 표시한다', async () => {
    mockGetStocks.mockRejectedValue(new Error('Network error'));
    renderHook(() => useStocksPageWithOptions());

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.any(String),
        'error',
      );
    });
  });
});
