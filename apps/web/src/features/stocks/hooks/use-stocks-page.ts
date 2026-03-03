'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  exportStocks,
  getStockItems,
  getStockItemTrend,
  getStocks,
  updateStock,
} from '@/features/stocks/api/stocks.api';
import type {
  ItemAnalyticsRange,
  StockItemOption,
  StockItemTrend,
  StockRow,
  StorageType,
} from '@/features/stocks/model/types';
import { useToast } from '@/shared/ui/toast/toast-provider';

function errorMessageFromUnknown(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as { message?: string | string[] };
    if (Array.isArray(payload?.message)) return payload.message[0] ?? '재고 조회에 실패했습니다.';
    return payload?.message ?? '재고 조회에 실패했습니다.';
  }
  return '재고 조회에 실패했습니다.';
}

export function useStocksPage() {
  return useStocksPageWithOptions();
}

export function useStocksPageWithOptions(options?: {
  analysisItemId?: string;
  analysisRange?: ItemAnalyticsRange;
  storageType?: '' | StorageType;
  itemCode?: string;
  page?: number;
  pageSize?: number;
}) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [storageType, setStorageType] = useState<'' | StorageType>(options?.storageType ?? '');
  const [itemCode, setItemCode] = useState(options?.itemCode ?? '');
  const [analysisItems, setAnalysisItems] = useState<StockItemOption[]>([]);
  const [analysisItemId, setAnalysisItemId] = useState(options?.analysisItemId ?? '');
  const [analysisRange, setAnalysisRange] = useState<ItemAnalyticsRange>(
    options?.analysisRange ?? 'WEEK',
  );
  const [analysisTrend, setAnalysisTrend] = useState<StockItemTrend | null>(null);
  const [updatingStockId, setUpdatingStockId] = useState<string | null>(null);
  const [page, setPage] = useState(options?.page ?? 1);
  const [pageSize, setPageSize] = useState(options?.pageSize ?? 50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const initialFiltersRef = useRef({
    storageType: options?.storageType ?? '',
    itemCode: options?.itemCode ?? '',
    page: options?.page ?? 1,
    pageSize: options?.pageSize ?? 50,
  });

  const fetchStocks = useCallback(
    async (params?: {
      storageType?: StorageType;
      itemCode?: string;
      page?: number;
      pageSize?: number;
      append?: boolean;
    }) => {
      setLoading(true);
      try {
        const data = await getStocks({
          storageType: params?.storageType,
          itemCode: params?.itemCode,
          page: params?.page ?? 1,
          pageSize: params?.pageSize ?? 50,
        });
        setRows((prev) => (params?.append ? [...prev, ...data.items] : data.items));
        setPage(data.page);
        setPageSize(data.pageSize);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } catch (error) {
        showToast(errorMessageFromUnknown(error), 'error');
      } finally {
        setLoading(false);
      }
    },
    [showToast],
  );

  const loadStocks = useCallback(async (params?: {
    nextPage?: number;
    nextPageSize?: number;
    append?: boolean;
  }) => {
    await fetchStocks({
      storageType: storageType || undefined,
      itemCode: itemCode || undefined,
      page: params?.nextPage ?? 1,
      pageSize: params?.nextPageSize ?? pageSize,
      append: params?.append,
    });
  }, [fetchStocks, itemCode, pageSize, storageType]);

  useEffect(() => {
    const initial = initialFiltersRef.current;
    void fetchStocks({
      storageType: initial.storageType || undefined,
      itemCode: initial.itemCode || undefined,
      page: initial.page,
      pageSize: initial.pageSize,
    });
  }, [fetchStocks]);

  const loadAnalysisItems = useCallback(async () => {
    try {
      const items = await getStockItems();
      setAnalysisItems(items);
      setAnalysisItemId((prev) => prev || items[0]?.id || '');
    } catch (error) {
      showToast(errorMessageFromUnknown(error), 'error');
    }
  }, [showToast]);

  useEffect(() => {
    void loadAnalysisItems();
  }, [loadAnalysisItems]);

  const loadAnalysisTrend = useCallback(async () => {
    if (!analysisItemId) {
      setAnalysisTrend(null);
      return;
    }
    setAnalysisLoading(true);
    try {
      const trend = await getStockItemTrend(analysisItemId, analysisRange);
      setAnalysisTrend(trend);
    } catch (error) {
      showToast(errorMessageFromUnknown(error), 'error');
    } finally {
      setAnalysisLoading(false);
    }
  }, [analysisItemId, analysisRange, showToast]);

  useEffect(() => {
    void loadAnalysisTrend();
  }, [loadAnalysisTrend]);

  function resetFilters() {
    setStorageType('');
    setItemCode('');
  }

  async function resetFiltersAndReload() {
    setStorageType('');
    setItemCode('');
    await fetchStocks({ page: 1, pageSize, append: false });
  }

  async function updateStockRow(params: {
    stockId: string;
    onHand: number;
    reserved: number;
    memo?: string;
  }) {
    setUpdatingStockId(params.stockId);
    try {
      const updated = await updateStock(params.stockId, {
        onHand: params.onHand,
        reserved: params.reserved,
        memo: params.memo,
      });
      setRows((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      showToast('재고를 수정했습니다.', 'success');
    } catch (error) {
      showToast(errorMessageFromUnknown(error), 'error');
    } finally {
      setUpdatingStockId(null);
    }
  }

  async function downloadStocksExcel() {
    try {
      const blob = await exportStocks({
        storageType: storageType || undefined,
        itemCode: itemCode || undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stocks-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('재고 엑셀 다운로드를 시작했습니다.', 'success');
    } catch (error) {
      showToast(errorMessageFromUnknown(error), 'error');
    }
  }

  return {
    rows,
    loading,
    analysisLoading,
    storageType,
    itemCode,
    analysisItems,
    analysisItemId,
    analysisRange,
    analysisTrend,
    updatingStockId,
    page,
    pageSize,
    total,
    totalPages,
    setStorageType,
    setItemCode,
    setAnalysisItemId,
    setAnalysisRange,
    setPageSize,
    loadStocks,
    loadAnalysisTrend,
    updateStockRow,
    downloadStocksExcel,
    resetFilters,
    resetFiltersAndReload,
  };
}
