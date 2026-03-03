'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  cancelReturn,
  createReturn,
  decideReturn,
  getCustomers,
  getReturnDetail,
  getReturns,
  processReturn,
  updateReturn,
} from '@/features/returns/api/returns.api';
import type {
  ReturnLineDecision,
  ReturnReceipt,
  StorageType,
} from '@/features/returns/model/types';
import type { UserRole } from '@/features/auth/model/types';
import { getStocks } from '@/features/stocks/api/stocks.api';
import { useToast } from '@/shared/ui/toast/toast-provider';

function errorMessageFromUnknown(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as { message?: string | string[] };
    if (Array.isArray(payload?.message)) return payload.message[0] ?? '반품 요청에 실패했습니다.';
    return payload?.message ?? '반품 요청에 실패했습니다.';
  }
  return '반품 요청에 실패했습니다.';
}

export function useReturnsPage(role?: UserRole) {
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<Array<{ id: string; customerName: string }>>([]);
  const [items, setItems] = useState<Array<{ id: string; itemCode: string; itemName: string }>>(
    [],
  );
  const [receipts, setReceipts] = useState<ReturnReceipt[]>([]);
  const [selected, setSelected] = useState<ReturnReceipt | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [decisionMap, setDecisionMap] = useState<Record<string, ReturnLineDecision>>({});
  const [processLineIds, setProcessLineIds] = useState<string[]>([]);
  const [lineQtyMap, setLineQtyMap] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [newCustomerId, setNewCustomerId] = useState('');
  const [newMemo, setNewMemo] = useState('');
  const [createItemChecked, setCreateItemChecked] = useState<Record<string, boolean>>({});
  const [createItemStorageType, setCreateItemStorageType] = useState<
    Record<string, StorageType>
  >({});
  const [createItemQty, setCreateItemQty] = useState<Record<string, string>>({});
  const [createItemExpiry, setCreateItemExpiry] = useState<Record<string, string>>({});

  const refreshList = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await getReturns();
      setReceipts(data);
    } catch (error) {
      showToast(errorMessageFromUnknown(error), 'error');
    } finally {
      setLoadingList(false);
    }
  }, [showToast]);

  const loadFormMeta = useCallback(async () => {
    try {
      const [customersData, stocks] = await Promise.all([getCustomers(), getStocks()]);
      setCustomers(customersData);
      const uniqueItems = new Map<string, { id: string; itemCode: string; itemName: string }>();
      stocks.forEach((row) => {
        uniqueItems.set(row.lot.item.id, {
          id: row.lot.item.id,
          itemCode: row.lot.item.itemCode,
          itemName: row.lot.item.itemName,
        });
      });
      setItems(Array.from(uniqueItems.values()));
    } catch (error) {
      showToast(errorMessageFromUnknown(error), 'error');
    }
  }, [showToast]);

  const loadDetail = useCallback(
    async (id: string) => {
      setLoadingDetail(true);
      try {
        const detail = await getReturnDetail(id);
        setSelected(detail);
        setDecisionMap(
          Object.fromEntries(
            detail.lines.map((line) => [line.id, line.decision ?? 'RESTOCK']),
          ),
        );
        setProcessLineIds(
          detail.lines.filter((line) => line.processedAt == null).map((line) => line.id),
        );
        setLineQtyMap(
          Object.fromEntries(detail.lines.map((line) => [line.id, String(line.qty)])),
        );
      } catch (error) {
        showToast(errorMessageFromUnknown(error), 'error');
      } finally {
        setLoadingDetail(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  useEffect(() => {
    void loadFormMeta();
  }, [loadFormMeta]);

  const canManageReturns = useMemo(
    () => role === 'ADMIN' || role === 'WH_MANAGER',
    [role],
  );

  const canDecide = canManageReturns && selected?.status === 'RECEIVED';
  const canProcess = canManageReturns && selected?.status === 'DECIDED';
  const filteredReceipts = receipts.filter((receipt) => {
    const statusMatched = statusFilter ? receipt.status === statusFilter : true;
    const key = keyword.trim().toLowerCase();
    const keyMatched = key
      ? receipt.id.toLowerCase().includes(key) ||
        String(receipt.receiptNo ?? '').includes(key) ||
        (receipt.customer?.name ?? receipt.customer?.customerName ?? '')
          .toLowerCase()
          .includes(key)
      : true;
    return statusMatched && keyMatched;
  });

  function decideDisabledReason(): string | undefined {
    if (!selected) return '상세를 선택해주세요.';
    if (!canManageReturns) return 'ADMIN/WH_MANAGER만 가능합니다.';
    if (selected.status !== 'RECEIVED') return 'RECEIVED 상태에서만 가능합니다.';
    return undefined;
  }

  function processDisabledReason(): string | undefined {
    if (!selected) return '상세를 선택해주세요.';
    if (!canManageReturns) return 'ADMIN/WH_MANAGER만 가능합니다.';
    if (selected.status !== 'DECIDED') return 'DECIDED 상태에서만 가능합니다.';
    if (processLineIds.length === 0) return '처리할 라인을 선택해주세요.';
    return undefined;
  }

  const canCreateOrEditReceipt =
    role === 'ADMIN' || role === 'DELIVERY' || role === 'SALES';

  const canEditSelectedReceipt =
    canCreateOrEditReceipt && selected?.status === 'RECEIVED';

  async function createReceipt() {
    const lines = items
      .filter((item) => createItemChecked[item.id])
      .map((item) => {
        const qty = Number(createItemQty[item.id] ?? '0');
        return {
          itemId: item.id,
          storageType: createItemStorageType[item.id] ?? 'DRY',
          qty,
          expiryDate: createItemExpiry[item.id] || undefined,
        };
      })
      .filter((line) => Number.isFinite(line.qty) && line.qty > 0);

    if (lines.length === 0) {
      showToast('선택한 품목의 수량을 입력해주세요.', 'error');
      return;
    }

    setCreating(true);
    try {
      const created = await createReturn({
        customerId: newCustomerId || undefined,
        memo: newMemo.trim() || undefined,
        lines,
      });
      showToast('반품 접수를 생성했습니다.', 'success');
      await refreshList();
      await loadDetail(created.id);
      setNewMemo('');
      setCreateItemChecked({});
      setCreateItemStorageType({});
      setCreateItemQty({});
      setCreateItemExpiry({});
    } catch (error) {
      showToast(errorMessageFromUnknown(error), 'error');
    } finally {
      setCreating(false);
    }
  }

  function toggleCreateItem(itemId: string) {
    setCreateItemChecked((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  }

  function setCreateStorageType(itemId: string, storageType: StorageType) {
    setCreateItemStorageType((prev) => ({ ...prev, [itemId]: storageType }));
  }

  function setCreateQty(itemId: string, qty: string) {
    setCreateItemQty((prev) => ({ ...prev, [itemId]: qty }));
  }

  function setCreateExpiry(itemId: string, expiryDate: string) {
    setCreateItemExpiry((prev) => ({ ...prev, [itemId]: expiryDate }));
  }

  function selectCreateItems(itemIds: string[]) {
    setCreateItemChecked((prev) => {
      const next = { ...prev };
      itemIds.forEach((itemId) => {
        next[itemId] = true;
      });
      return next;
    });
  }

  function unselectCreateItems(itemIds: string[]) {
    setCreateItemChecked((prev) => {
      const next = { ...prev };
      itemIds.forEach((itemId) => {
        next[itemId] = false;
      });
      return next;
    });
  }

  async function updateLineQty(lineId: string) {
    if (!selected || !canEditSelectedReceipt) return;
    const qty = Number(lineQtyMap[lineId]);
    if (!Number.isFinite(qty) || qty <= 0) {
      showToast('수량은 0보다 커야 합니다.', 'error');
      return;
    }
    setActionLoading('update');
    try {
      await updateReturn(selected.id, {
        lines: [{ id: lineId, qty }],
      });
      showToast('라인 수량을 수정했습니다.', 'success');
      await refreshList();
      await loadDetail(selected.id);
    } catch (error) {
      showToast(errorMessageFromUnknown(error), 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function removeLine(lineId: string) {
    if (!selected || !canEditSelectedReceipt) return;
    setActionLoading('removeLine');
    try {
      await updateReturn(selected.id, {
        lines: [{ id: lineId, isDeleted: true }],
      });
      showToast('라인을 삭제했습니다.', 'success');
      await refreshList();
      await loadDetail(selected.id);
    } catch (error) {
      showToast(errorMessageFromUnknown(error), 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function cancelReceipt() {
    if (!selected || !canEditSelectedReceipt) return;
    setActionLoading('cancelReceipt');
    try {
      await cancelReturn(selected.id);
      showToast('반품 접수를 취소했습니다.', 'success');
      await refreshList();
      await loadDetail(selected.id);
    } catch (error) {
      showToast(errorMessageFromUnknown(error), 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function submitDecide() {
    if (!selected || !canDecide) return;
    setActionLoading('decide');
    try {
      const lines = selected.lines.map((line) => ({
        lineId: line.id,
        decision: decisionMap[line.id] ?? 'RESTOCK',
      }));
      await decideReturn(selected.id, lines);
      await refreshList();
      await loadDetail(selected.id);
      showToast('반품 판정을 완료했습니다.', 'success');
    } catch (error) {
      showToast(errorMessageFromUnknown(error), 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function submitProcess() {
    if (!selected || !canProcess) return;
    if (processLineIds.length === 0) {
      showToast('처리할 라인을 선택해주세요.', 'error');
      return;
    }
    setActionLoading('process');
    try {
      await processReturn(selected.id, processLineIds);
      await refreshList();
      await loadDetail(selected.id);
      showToast('반품 재고 반영을 완료했습니다.', 'success');
    } catch (error) {
      showToast(errorMessageFromUnknown(error), 'error');
    } finally {
      setActionLoading(null);
    }
  }

  function toggleProcessLine(lineId: string) {
    setProcessLineIds((prev) =>
      prev.includes(lineId) ? prev.filter((id) => id !== lineId) : [...prev, lineId],
    );
  }

  return {
    customers,
    items,
    receipts,
    filteredReceipts,
    selected,
    loadingList,
    loadingDetail,
    actionLoading,
    creating,
    decisionMap,
    processLineIds,
    lineQtyMap,
    statusFilter,
    keyword,
    setStatusFilter,
    setKeyword,
    newCustomerId,
    setNewCustomerId,
    newMemo,
    setNewMemo,
    createItemChecked,
    createItemStorageType,
    createItemQty,
    createItemExpiry,
    toggleCreateItem,
    setCreateStorageType,
    setCreateQty,
    setCreateExpiry,
    selectCreateItems,
    unselectCreateItems,
    canDecide,
    canProcess,
    canEditSelectedReceipt,
    decideDisabledReason,
    processDisabledReason,
    loadDetail,
    setDecisionMap,
    setLineQtyMap,
    toggleProcessLine,
    createReceipt,
    updateLineQty,
    removeLine,
    cancelReceipt,
    submitDecide,
    submitProcess,
  };
}
