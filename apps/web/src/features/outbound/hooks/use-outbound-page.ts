'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  cancelOutboundLine,
  cancelOutboundOrder,
  createOutboundOrder,
  completeShipping,
  getCustomers,
  getOutboundOrderDetail,
  getOutboundOrders,
  startShipping,
  submitPick,
  updateOutboundLine,
  verifyShipping,
} from '@/features/outbound/api/outbound.api';
import type { OutboundOrder } from '@/features/outbound/model/types';
import type { UserRole } from '@/features/auth/model/types';
import { getStocks } from '@/features/stocks/api/stocks.api';
import type { StorageType } from '@/features/stocks/model/types';
import { useToast } from '@/shared/ui/toast/toast-provider';
import { getErrorMessage } from '@/shared/utils/get-error-message';

export function useOutboundPage(role?: UserRole) {
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<Array<{ id: string; customerName: string }>>([]);
  const [stockRows, setStockRows] = useState<Awaited<ReturnType<typeof getStocks>>['items']>([]);
  const [orders, setOrders] = useState<OutboundOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OutboundOrder | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [newCustomerId, setNewCustomerId] = useState('');
  const [newPlannedDate, setNewPlannedDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [newMemo, setNewMemo] = useState('');
  const [createItemChecked, setCreateItemChecked] = useState<Record<string, boolean>>({});
  const [createItemQty, setCreateItemQty] = useState<Record<string, string>>({});
  const [cancelReason, setCancelReason] = useState('');
  const [lineQtyMap, setLineQtyMap] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<
    'orderNo' | 'customer' | 'status' | 'plannedDate' | 'lineCount'
  >('plannedDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const refreshOrders = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await getOutboundOrders();
      setOrders(data);
    } catch (error) {
      showToast(getErrorMessage(error, '출고 요청에 실패했습니다.'), 'error');
    } finally {
      setLoadingList(false);
    }
  }, [showToast]);

  const loadFormMeta = useCallback(async () => {
    try {
      const [customersData, stocksRes] = await Promise.all([getCustomers(), getStocks()]);
      setCustomers(customersData);
      setStockRows(stocksRes.items);
    } catch (error) {
      showToast(getErrorMessage(error, '출고 요청에 실패했습니다.'), 'error');
    }
  }, [showToast]);

  const loadOrderDetail = useCallback(
    async (orderId: string) => {
      setLoadingDetail(true);
      try {
        const data = await getOutboundOrderDetail(orderId);
        setSelectedOrder(data);
        setLineQtyMap(
          Object.fromEntries(
            data.lines.map((line) => [line.id, String(line.requestedQty)]),
          ),
        );
      } catch (error) {
        showToast(getErrorMessage(error, '출고 요청에 실패했습니다.'), 'error');
      } finally {
        setLoadingDetail(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    void refreshOrders();
  }, [refreshOrders]);

  useEffect(() => {
    void loadFormMeta();
  }, [loadFormMeta]);

  const filteredOrders = orders.filter((order) => {
    const statusMatched = statusFilter ? order.status === statusFilter : true;
    const key = keyword.trim().toLowerCase();
    const keyMatched = key
      ? order.id.toLowerCase().includes(key) ||
        String(order.orderNo ?? '').includes(key) ||
        (order.customer?.name ?? order.customer?.customerName ?? '')
          .toLowerCase()
          .includes(key)
      : true;
    return statusMatched && keyMatched;
  });

  const availableCreateItems = useMemo(() => {
    const grouped = new Map<
      string,
      {
        id: string;
        itemCode: string;
        itemName: string;
        availableQty: number;
        storageTypes: Set<StorageType>;
      }
    >();
    stockRows.forEach((row) => {
      const current = grouped.get(row.lot.item.id);
      const availableQty = row.onHand - row.reserved;
      if (!current) {
        grouped.set(row.lot.item.id, {
          id: row.lot.item.id,
          itemCode: row.lot.item.itemCode,
          itemName: row.lot.item.itemName,
          availableQty,
          storageTypes: new Set<StorageType>([row.warehouse.type]),
        });
      } else {
        grouped.set(row.lot.item.id, {
          ...current,
          availableQty: current.availableQty + availableQty,
          storageTypes: new Set<StorageType>([
            ...Array.from(current.storageTypes),
            row.warehouse.type,
          ]),
        });
      }
    });
    return Array.from(grouped.values())
      .map((item) => ({
        ...item,
        storageTypes: Array.from(item.storageTypes).sort(),
      }))
      .sort((a, b) => a.itemCode.localeCompare(b.itemCode));
  }, [stockRows]);

  async function runAction(
    actionKey: string,
    action: () => Promise<void>,
    successMessage: string,
  ) {
    if (!selectedOrder) return;
    setActionLoading(actionKey);
    try {
      await action();
      await refreshOrders();
      await loadOrderDetail(selectedOrder.id);
      showToast(successMessage, 'success');
    } catch (error) {
      showToast(getErrorMessage(error, '출고 요청에 실패했습니다.'), 'error');
    } finally {
      setActionLoading(null);
    }
  }

  function canSubmitPick(order?: OutboundOrder | null): boolean {
    if (!order) return false;
    return (role === 'ADMIN' || role === 'WH_MANAGER') && order.status === 'PICKING';
  }

  function submitPickDisabledReason(order?: OutboundOrder | null): string | undefined {
    if (!order) return '오더 상세를 선택해주세요.';
    if (!(role === 'ADMIN' || role === 'WH_MANAGER')) return 'ADMIN/WH_MANAGER만 가능합니다.';
    if (order.status !== 'PICKING') return 'PICKING 상태에서만 가능합니다.';
    return undefined;
  }

  function verifyDisabledReason(order?: OutboundOrder | null): string | undefined {
    if (!order) return '오더 상세를 선택해주세요.';
    if (!(role === 'ADMIN' || role === 'WH_MANAGER' || role === 'DELIVERY'))
      return 'ADMIN/WH_MANAGER/DELIVERY만 가능합니다.';
    if (order.status !== 'PICKED') return 'PICKED 상태에서만 가능합니다.';
    return undefined;
  }

  function startDisabledReason(order?: OutboundOrder | null): string | undefined {
    if (!order) return '오더 상세를 선택해주세요.';
    if (!(role === 'ADMIN' || role === 'DELIVERY')) return 'ADMIN/DELIVERY만 가능합니다.';
    if (order.status !== 'READY_TO_SHIP') return 'READY_TO_SHIP 상태에서만 가능합니다.';
    return undefined;
  }

  function completeDisabledReason(order?: OutboundOrder | null): string | undefined {
    if (!order) return '오더 상세를 선택해주세요.';
    if (!(role === 'ADMIN' || role === 'DELIVERY')) return 'ADMIN/DELIVERY만 가능합니다.';
    if (order.status !== 'SHIPPING') return 'SHIPPING 상태에서만 가능합니다.';
    return undefined;
  }

  function canVerify(order?: OutboundOrder | null): boolean {
    if (!order) return false;
    return (
      (role === 'ADMIN' || role === 'WH_MANAGER' || role === 'DELIVERY') &&
      order.status === 'PICKED'
    );
  }

  function canStart(order?: OutboundOrder | null): boolean {
    if (!order) return false;
    return (role === 'ADMIN' || role === 'DELIVERY') && order.status === 'READY_TO_SHIP';
  }

  function canComplete(order?: OutboundOrder | null): boolean {
    if (!order) return false;
    return (role === 'ADMIN' || role === 'DELIVERY') && order.status === 'SHIPPING';
  }

  const canEditOrder = (order?: OutboundOrder | null): boolean => {
    if (!order) return false;
    if (!(role === 'ADMIN' || role === 'SALES')) return false;
    return !['SHIPPING', 'DELIVERED', 'CANCELLED'].includes(order.status);
  };

  async function createOrder() {
    if (!newCustomerId || !newPlannedDate) {
      showToast('고객사/출고예정일을 확인해주세요.', 'error');
      return;
    }
    const selectedLines = availableCreateItems
      .filter((item) => createItemChecked[item.id])
      .map((item) => ({
        itemId: item.id,
        requestedQty: Number(createItemQty[item.id] ?? '0'),
      }))
      .filter((line) => Number.isFinite(line.requestedQty) && line.requestedQty > 0);
    if (selectedLines.length === 0) {
      showToast('선택한 품목의 수량을 입력해주세요.', 'error');
      return;
    }
    setCreating(true);
    try {
      const created = await createOutboundOrder({
        customerId: newCustomerId,
        plannedDate: newPlannedDate,
        memo: newMemo.trim() || undefined,
        lines: selectedLines,
      });
      showToast('출고 오더를 생성했습니다.', 'success');
      await refreshOrders();
      await loadOrderDetail(created.id);
      setNewMemo('');
      setCreateItemChecked({});
      setCreateItemQty({});
    } catch (error) {
      showToast(getErrorMessage(error, '출고 요청에 실패했습니다.'), 'error');
    } finally {
      setCreating(false);
    }
  }

  function toggleCreateItem(itemId: string) {
    setCreateItemChecked((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  }

  function setCreateLineQty(itemId: string, qty: string) {
    setCreateItemQty((prev) => ({ ...prev, [itemId]: qty }));
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
    if (!selectedOrder) return;
    const qty = Number(lineQtyMap[lineId]);
    if (!Number.isFinite(qty) || qty < 1) {
      showToast('요청수량은 1 이상이어야 합니다.', 'error');
      return;
    }
    setActionLoading('updateLine');
    try {
      await updateOutboundLine(selectedOrder.id, lineId, qty);
      showToast('라인 수량을 수정했습니다.', 'success');
      await refreshOrders();
      await loadOrderDetail(selectedOrder.id);
    } catch (error) {
      showToast(getErrorMessage(error, '출고 요청에 실패했습니다.'), 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function cancelLine(lineId: string) {
    if (!selectedOrder) return;
    setActionLoading('cancelLine');
    try {
      await cancelOutboundLine(selectedOrder.id, lineId);
      showToast('라인을 취소했습니다.', 'success');
      await refreshOrders();
      await loadOrderDetail(selectedOrder.id);
    } catch (error) {
      showToast(getErrorMessage(error, '출고 요청에 실패했습니다.'), 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function cancelOrder() {
    if (!selectedOrder) return;
    setActionLoading('cancelOrder');
    try {
      await cancelOutboundOrder(selectedOrder.id, cancelReason.trim() || undefined);
      showToast('오더를 취소했습니다.', 'success');
      setCancelReason('');
      await refreshOrders();
      await loadOrderDetail(selectedOrder.id);
    } catch (error) {
      showToast(getErrorMessage(error, '출고 요청에 실패했습니다.'), 'error');
    } finally {
      setActionLoading(null);
    }
  }

  return {
    customers,
    orders,
    filteredOrders,
    selectedOrder,
    loadingList,
    loadingDetail,
    actionLoading,
    creating,
    refreshOrders,
    loadOrderDetail,
    statusFilter,
    keyword,
    setStatusFilter,
    setKeyword,
    newCustomerId,
    setNewCustomerId,
    newPlannedDate,
    setNewPlannedDate,
    newMemo,
    setNewMemo,
    availableCreateItems,
    createItemChecked,
    createItemQty,
    toggleCreateItem,
    setCreateLineQty,
    selectCreateItems,
    unselectCreateItems,
    cancelReason,
    setCancelReason,
    lineQtyMap,
    setLineQtyMap,
    sortKey,
    sortDir,
    toggleOutboundSort: (key: string) => {
      if (sortKey === key) {
        setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        return;
      }
      setSortKey(
        key as 'orderNo' | 'customer' | 'status' | 'plannedDate' | 'lineCount',
      );
      setSortDir('asc');
    },
    canSubmitPick,
    canVerify,
    canStart,
    canComplete,
    canEditOrder,
    submitPickDisabledReason,
    verifyDisabledReason,
    startDisabledReason,
    completeDisabledReason,
    createOrder,
    updateLineQty,
    cancelLine,
    cancelOrder,
    submitPick: () =>
      runAction('submitPick', () => submitPick(selectedOrder!.id), '픽 제출을 완료했습니다.'),
    verifyShipping: () =>
      runAction(
        'verifyShipping',
        () => verifyShipping(selectedOrder!.id),
        '배송 검수를 완료했습니다.',
      ),
    startShipping: () =>
      runAction(
        'startShipping',
        () => startShipping(selectedOrder!.id),
        '배송 출발 처리되었습니다.',
      ),
    completeShipping: () =>
      runAction(
        'completeShipping',
        () => completeShipping(selectedOrder!.id),
        '배송 완료 처리되었습니다.',
      ),
  };
}
