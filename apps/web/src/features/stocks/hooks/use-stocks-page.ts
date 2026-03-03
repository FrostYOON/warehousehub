'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { getStocks } from '@/features/stocks/api/stocks.api';
import type { StockRow, StorageType } from '@/features/stocks/model/types';
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
  const { showToast } = useToast();
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [storageType, setStorageType] = useState<'' | StorageType>('');
  const [itemCode, setItemCode] = useState('');

  const loadStocks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStocks({
        storageType: storageType || undefined,
        itemCode: itemCode || undefined,
      });
      setRows(data);
    } catch (error) {
      showToast(errorMessageFromUnknown(error), 'error');
    } finally {
      setLoading(false);
    }
  }, [itemCode, showToast, storageType]);

  useEffect(() => {
    void loadStocks();
  }, [loadStocks]);

  function resetFilters() {
    setStorageType('');
    setItemCode('');
  }

  async function resetFiltersAndReload() {
    setStorageType('');
    setItemCode('');
    setLoading(true);
    try {
      const data = await getStocks();
      setRows(data);
    } catch (error) {
      showToast(errorMessageFromUnknown(error), 'error');
    } finally {
      setLoading(false);
    }
  }

  return {
    rows,
    loading,
    storageType,
    itemCode,
    setStorageType,
    setItemCode,
    loadStocks,
    resetFilters,
    resetFiltersAndReload,
  };
}
