'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthSession } from '@/features/auth';
import { exportOutbound } from '@/features/outbound/api/outbound.api';
import { useOutboundPage } from '@/features/outbound/hooks/use-outbound-page';
import { useToast } from '@/shared/ui/toast/toast-provider';
import { getErrorMessage } from '@/shared/utils/get-error-message';
import type { StorageType } from '@/features/stocks/model/types';
import { formatDecimalForDisplay } from '@/shared/utils/format-decimal';
import { buildGoogleMapsDirectionUrl } from '@/shared/utils/google-maps';
import { ActionButton, SortableHeader, StatusBadge } from '@/shared/ui/common';
import { OrderPrintPdfButtons } from '@/features/outbound/components/order-print-pdf-buttons';

export default function OutboundPage() {
  const searchParams = useSearchParams();
  const { me } = useAuthSession();
  const { showToast } = useToast();

  const handleExportOutbound = useCallback(async () => {
    try {
      const blob = await exportOutbound();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `outbound-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('출고 엑셀 다운로드를 시작했습니다.', 'success');
    } catch (error) {
      showToast(getErrorMessage(error, '엑셀 다운로드에 실패했습니다.'), 'error');
    }
  }, [showToast]);

  const {
    customers,
    orders,
    filteredOrders,
    selectedOrder,
    loadingList,
    loadingDetail,
    actionLoading,
    creating,
    loadOrderDetail,
    statusFilter,
    keyword,
    setStatusFilter,
    setKeyword,
    canSubmitPick,
    canVerify,
    canStart,
    canComplete,
    submitPickDisabledReason,
    verifyDisabledReason,
    startDisabledReason,
    completeDisabledReason,
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
    toggleOutboundSort,
    canEditOrder,
    createOrder,
    updateLineQty,
    cancelLine,
    cancelOrder,
    submitPick,
    verifyShipping,
    startShipping,
    completeShipping,
  } = useOutboundPage(me?.role);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [typeFilters, setTypeFilters] = useState<StorageType[]>([
    'DRY',
    'COOL',
    'FRZ',
  ]);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [sameDayOnly, setSameDayOnly] = useState(false);

  const canAccessSameDayView = me?.role === 'DELIVERY' || me?.role === 'ADMIN';

  const customerDisplayName = (customer?: {
    name?: string;
    customerName?: string;
  } | null) => customer?.name ?? customer?.customerName ?? '-';

  const outboundDisplayNo = (order: { orderNo?: number; plannedDate: string }) => {
    if (typeof order.orderNo === 'number') {
      return `OB-${String(order.orderNo).padStart(6, '0')}`;
    }
    const date = new Date(order.plannedDate);
    const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(
      2,
      '0',
    )}${String(date.getDate()).padStart(2, '0')}`;
    return `OB-${ymd}`;
  };

  const filteredCreateItems = useMemo(() => {
    const key = itemSearch.trim().toLowerCase();
    const base = availableCreateItems.filter((item) => {
      const typeMatched =
        typeFilters.length === 0
          ? true
          : item.storageTypes.some((type) => typeFilters.includes(type));
      const keyMatched = key
        ? item.itemCode.toLowerCase().includes(key) ||
          item.itemName.toLowerCase().includes(key)
        : true;
      return typeMatched && keyMatched;
    });
    return showSelectedOnly
      ? base.filter((item) => Boolean(createItemChecked[item.id]))
      : base;
  }, [availableCreateItems, itemSearch, typeFilters, showSelectedOnly, createItemChecked]);

  const selectedItemCount = Object.values(createItemChecked).filter(Boolean).length;
  const selectedTotalQty = Object.entries(createItemQty).reduce((sum, [itemId, qtyText]) => {
    if (!createItemChecked[itemId]) return sum;
    const qty = Number(qtyText);
    return Number.isFinite(qty) && qty > 0 ? sum + qty : sum;
  }, 0);

  const toggleTypeFilter = (type: StorageType) => {
    setTypeFilters((prev) =>
      prev.includes(type) ? prev.filter((value) => value !== type) : [...prev, type],
    );
  };

  const presetStatuses = useMemo(() => {
    const statuses = searchParams.get('statuses');
    if (!statuses) return [];
    const validSet = new Set([
      'DRAFT',
      'PICKING',
      'PICKED',
      'READY_TO_SHIP',
      'SHIPPING',
      'DELIVERED',
      'CANCELLED',
    ]);
    return statuses
      .split(',')
      .map((value) => value.trim())
      .filter((value) => validSet.has(value));
  }, [searchParams]);

  const drilldownFilters = useMemo(() => {
    const itemId = searchParams.get('itemId') ?? '';
    const customerId = searchParams.get('customerId') ?? '';
    const from = searchParams.get('from') ?? '';
    const to = searchParams.get('to') ?? '';
    const storageType = searchParams.get('storageType') ?? '';
    return { itemId, customerId, from, to, storageType };
  }, [searchParams]);

  const displayedOrders = useMemo(() => {
    const scope = new Set(presetStatuses);
    let base =
      presetStatuses.length > 0 && !statusFilter
        ? orders.filter((order) => scope.has(order.status))
        : filteredOrders;

    const key = keyword.trim().toLowerCase();
    base = base.filter((order) => {
      const keyMatched = key
        ? order.id.toLowerCase().includes(key) ||
          String(order.orderNo ?? '').includes(key) ||
          (order.customer?.name ?? order.customer?.customerName ?? '')
            .toLowerCase()
            .includes(key)
        : true;
      return keyMatched;
    });

    if (drilldownFilters.customerId) {
      base = base.filter((order) => order.customerId === drilldownFilters.customerId);
    }
    if (drilldownFilters.itemId) {
      base = base.filter((order) => order.lines.some((line) => line.itemId === drilldownFilters.itemId));
    }
    if (drilldownFilters.from) {
      const from = new Date(drilldownFilters.from);
      base = base.filter((order) => new Date(order.plannedDate) >= from);
    }
    if (drilldownFilters.to) {
      const to = new Date(drilldownFilters.to);
      to.setDate(to.getDate() + 1);
      base = base.filter((order) => new Date(order.plannedDate) < to);
    }
    if (sameDayOnly) {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);
      base = base.filter(
        (order) =>
          new Date(order.plannedDate) >= todayStart &&
          new Date(order.plannedDate) < todayEnd,
      );
    }
    if (
      drilldownFilters.storageType === 'DRY' ||
      drilldownFilters.storageType === 'COOL' ||
      drilldownFilters.storageType === 'FRZ'
    ) {
      const itemTypeMap = new Map(
        availableCreateItems.map((item) => [item.id, new Set(item.storageTypes)]),
      );
      base = base.filter((order) =>
        order.lines.some((line) =>
          itemTypeMap.get(line.itemId)?.has(drilldownFilters.storageType as StorageType),
        ),
      );
    }

    const factor = sortDir === 'asc' ? 1 : -1;
    return [...base].sort((a, b) => {
      const customerName = (c?: { name?: string; customerName?: string } | null) =>
        c?.name ?? c?.customerName ?? '-';
      switch (sortKey) {
        case 'orderNo':
          return factor * ((a.orderNo ?? 0) - (b.orderNo ?? 0));
        case 'customer':
          return factor * customerName(a.customer).localeCompare(customerName(b.customer));
        case 'status':
          return factor * a.status.localeCompare(b.status);
        case 'plannedDate':
          return factor * (
            new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime()
          );
        case 'lineCount':
          return factor * (a.lines.length - b.lines.length);
        default:
          return 0;
      }
    });
  }, [
    availableCreateItems,
    drilldownFilters,
    filteredOrders,
    keyword,
    orders,
    presetStatuses,
    sameDayOnly,
    sortDir,
    sortKey,
    statusFilter,
  ]);

  useEffect(() => {
    const status = searchParams.get('status');
    if (
      status === 'DRAFT' ||
      status === 'PICKING' ||
      status === 'PICKED' ||
      status === 'READY_TO_SHIP' ||
      status === 'SHIPPING' ||
      status === 'DELIVERED' ||
      status === 'CANCELLED'
    ) {
      setStatusFilter(status);
    }
    const key = searchParams.get('keyword');
    if (key) {
      setKeyword(key);
    }
  }, [searchParams, setKeyword, setStatusFilter]);

  return (
    <>
      <section className="page-section">
        <h2 className="page-title">출고 오더</h2>
        <p className="page-description">
          출고 오더 목록을 확인하고, 상태에 따라 픽/배송 액션을 수행할 수 있습니다.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[220px_180px_1fr_auto_auto]">
          <select
            value={newCustomerId}
            onChange={(e) => setNewCustomerId(e.target.value)}
            className="form-select"
          >
            <option value="">고객사 선택</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.customerName}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={newPlannedDate}
            onChange={(e) => setNewPlannedDate(e.target.value)}
            className="form-input"
          />
          <input
            value={newMemo}
            onChange={(e) => setNewMemo(e.target.value)}
            className="form-input"
            placeholder="메모 (선택)"
          />
          <ActionButton
            onClick={() => setIsItemModalOpen(true)}
            variant="secondary"
            size="lg"
          >
            품목 선택 ({selectedItemCount})
          </ActionButton>
          <ActionButton onClick={() => void createOrder()} disabled={creating}>
            {creating ? '생성 중...' : '오더 생성'}
          </ActionButton>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          DRY/COOL/FRZ 타입을 함께 선택해서 한 번에 오더 생성할 수 있습니다.
        </p>
      </section>

      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-5xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">출고 품목 선택</h3>
              <ActionButton
                onClick={() => setIsItemModalOpen(false)}
                className="h-8 rounded-md border border-slate-300 px-2 text-xs hover:bg-slate-100"
              >
                닫기
              </ActionButton>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_auto_auto]">
              <input
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
                placeholder="품목코드/품목명 검색"
              />
              {(['DRY', 'COOL', 'FRZ'] as StorageType[]).map((type) => (
                <label
                  key={type}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={typeFilters.includes(type)}
                    onChange={() => toggleTypeFilter(type)}
                  />
                  {type}
                </label>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ActionButton
                onClick={() => selectCreateItems(filteredCreateItems.map((item) => item.id))}
                className="h-8 rounded-md border border-slate-300 px-2 text-xs hover:bg-slate-100"
              >
                전체선택
              </ActionButton>
              <ActionButton
                onClick={() => unselectCreateItems(filteredCreateItems.map((item) => item.id))}
                className="h-8 rounded-md border border-slate-300 px-2 text-xs hover:bg-slate-100"
              >
                전체해제
              </ActionButton>
              <label className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-300 px-2 text-xs">
                <input
                  type="checkbox"
                  checked={showSelectedOnly}
                  onChange={(e) => setShowSelectedOnly(e.target.checked)}
                />
                선택된 품목만 보기
              </label>
            </div>
            <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              선택 품목 <span className="font-semibold">{selectedItemCount}</span>개 / 총 출고수량{' '}
              <span className="font-semibold">{selectedTotalQty.toFixed(3)}</span>
            </div>
            <div className="mt-3 max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="px-2 py-2">선택</th>
                    <th className="px-2 py-2">품목코드</th>
                    <th className="px-2 py-2">품목명</th>
                    <th className="px-2 py-2">타입</th>
                    <th className="px-2 py-2">가용수량</th>
                    <th className="px-2 py-2">출고수량</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCreateItems.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={Boolean(createItemChecked[item.id])}
                          onChange={() => toggleCreateItem(item.id)}
                        />
                      </td>
                      <td className="px-2 py-2">{item.itemCode}</td>
                      <td className="px-2 py-2">{item.itemName}</td>
                      <td className="px-2 py-2">{item.storageTypes.join(', ')}</td>
                      <td className="px-2 py-2">{item.availableQty}</td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={createItemQty[item.id] ?? ''}
                          onChange={(e) => setCreateLineQty(item.id, e.target.value)}
                          disabled={!createItemChecked[item.id]}
                          className="h-8 w-28 rounded-md border border-slate-300 px-2 text-xs"
                          placeholder="수량"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredCreateItems.length === 0 && (
                <p className="mt-3 text-sm text-slate-500">조건에 맞는 품목이 없습니다.</p>
              )}
            </div>
            <div className="mt-3 flex justify-end">
              <ActionButton onClick={() => setIsItemModalOpen(false)}>
                선택 완료
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      <section className="page-section">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="page-subtitle">오더 목록</h3>
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton
              variant="secondary"
              size="md"
              onClick={() => void handleExportOutbound()}
            >
              엑셀 다운로드
            </ActionButton>
            {canAccessSameDayView && (
              <button
                type="button"
                onClick={() => setSameDayOnly((prev) => !prev)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  sameDayOnly
                    ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-300'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                오늘 배송 {sameDayOnly ? `(${displayedOrders.length})` : ''}
              </button>
            )}
          </div>
        </div>
        {(drilldownFilters.itemId ||
          drilldownFilters.customerId ||
          drilldownFilters.storageType ||
          drilldownFilters.from ||
          drilldownFilters.to) && (
          <p className="mt-1 text-xs text-slate-500">
            대시보드 드릴다운 필터가 적용되었습니다.
          </p>
        )}
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr]">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-select"
          >
            <option value="">전체 상태</option>
            <option value="DRAFT">DRAFT</option>
            <option value="PICKING">PICKING</option>
            <option value="PICKED">PICKED</option>
            <option value="READY_TO_SHIP">READY_TO_SHIP</option>
            <option value="SHIPPING">SHIPPING</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="출고번호 또는 고객사명 검색"
            className="form-input"
          />
        </div>
        {loadingList ? (
          <p className="mt-3 text-sm text-slate-600">목록을 불러오는 중...</p>
        ) : displayedOrders.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">등록된 출고 오더가 없습니다.</p>
        ) : (
          <div className="table-wrapper mt-4">
            <table className="data-table min-w-[840px]">
              <thead>
                <tr>
                  <SortableHeader
                    label="출고번호"
                    sortKey="orderNo"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={toggleOutboundSort}
                  />
                  <SortableHeader
                    label="고객사"
                    sortKey="customer"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={toggleOutboundSort}
                  />
                  <SortableHeader
                    label="상태"
                    sortKey="status"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={toggleOutboundSort}
                  />
                  <SortableHeader
                    label="출고예정일"
                    sortKey="plannedDate"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={toggleOutboundSort}
                  />
                  <SortableHeader
                    label="라인 수"
                    sortKey="lineCount"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={toggleOutboundSort}
                  />
                  <th>상세</th>
                </tr>
              </thead>
              <tbody>
                {displayedOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="font-medium text-slate-700">
                      {outboundDisplayNo(order)}
                    </td>
                    <td>{customerDisplayName(order.customer)}</td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                    <td>
                      {new Date(order.plannedDate).toLocaleDateString()}
                    </td>
                    <td>{order.lines.length}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => void loadOrderDetail(order.id)}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                      >
                        보기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="page-section">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="page-subtitle">오더 상세</h3>
          <div className="flex flex-wrap items-center gap-2">
            {selectedOrder && (
              <OrderPrintPdfButtons
                order={selectedOrder}
                outboundDisplayNo={outboundDisplayNo(selectedOrder)}
              />
            )}
            {selectedOrder?.customer &&
              (() => {
                const mapsUrl = buildGoogleMapsDirectionUrl(selectedOrder.customer);
                return mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    지도에서 보기
                  </a>
                ) : null;
              })()}
            <ActionButton
              onClick={() => void submitPick()}
              disabled={!canSubmitPick(selectedOrder) || actionLoading !== null}
              disabledReason={submitPickDisabledReason(selectedOrder)}
            >
              {actionLoading === 'submitPick' ? '처리 중...' : '픽 제출'}
            </ActionButton>
            <ActionButton
              onClick={() => void verifyShipping()}
              disabled={!canVerify(selectedOrder) || actionLoading !== null}
              disabledReason={verifyDisabledReason(selectedOrder)}
            >
              {actionLoading === 'verifyShipping' ? '처리 중...' : '배송 검수'}
            </ActionButton>
            <ActionButton
              onClick={() => void startShipping()}
              disabled={!canStart(selectedOrder) || actionLoading !== null}
              disabledReason={startDisabledReason(selectedOrder)}
            >
              {actionLoading === 'startShipping' ? '처리 중...' : '배송 출발'}
            </ActionButton>
            <ActionButton
              onClick={() => void completeShipping()}
              disabled={!canComplete(selectedOrder) || actionLoading !== null}
              disabledReason={completeDisabledReason(selectedOrder)}
            >
              {actionLoading === 'completeShipping' ? '처리 중...' : '배송 완료'}
            </ActionButton>
          </div>
        </div>

        {loadingDetail ? (
          <p className="mt-3 text-sm text-slate-600">상세를 불러오는 중...</p>
        ) : !selectedOrder ? (
          <p className="mt-3 text-sm text-slate-600">
            오더 목록에서 상세 보기를 눌러주세요.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <p>출고번호: {outboundDisplayNo(selectedOrder)}</p>
              <p>
                상태: <StatusBadge status={selectedOrder.status} />
              </p>
              <p>고객사: {customerDisplayName(selectedOrder.customer)}</p>
              <p>메모: {selectedOrder.memo ?? '-'}</p>
              {buildGoogleMapsDirectionUrl(selectedOrder.customer) && (
                <p className="mt-2">
                  <a
                    href={buildGoogleMapsDirectionUrl(selectedOrder.customer)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                  >
                    <span aria-hidden>📍</span> 길찾기 (지도에서 보기)
                  </a>
                </p>
              )}
            </div>
            <div className="table-wrapper">
              <table className="data-table min-w-[860px]">
                <thead>
                  <tr>
                    <th>품목코드</th>
                    <th>품목명</th>
                    <th>요청수량</th>
                    <th>픽수량</th>
                    <th>배송수량</th>
                    <th>완료수량</th>
                    <th>상태</th>
                    <th>라인 작업</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.lines.map((line) => (
                    <tr key={line.id}>
                      <td>{line.item?.itemCode ?? '-'}</td>
                      <td>{line.item?.itemName ?? '-'}</td>
                      <td>{formatDecimalForDisplay(line.requestedQty)}</td>
                      <td>{formatDecimalForDisplay(line.pickedQty)}</td>
                      <td>{formatDecimalForDisplay(line.shippedQty)}</td>
                      <td>{formatDecimalForDisplay(line.deliveredQty)}</td>
                      <td>
                        <StatusBadge status={line.status} />
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            step="0.001"
                            value={lineQtyMap[line.id] ?? String(line.requestedQty)}
                            onChange={(e) =>
                              setLineQtyMap((prev) => ({ ...prev, [line.id]: e.target.value }))
                            }
                            disabled={!canEditOrder(selectedOrder) || line.status === 'CANCELLED'}
                            className="form-input h-8 w-24 px-2 text-xs"
                          />
                          <ActionButton
                            onClick={() => void updateLineQty(line.id)}
                            disabled={
                              !canEditOrder(selectedOrder) ||
                              line.status === 'CANCELLED' ||
                              actionLoading !== null
                            }
                            className="h-8 rounded-md border border-slate-300 px-2 text-xs hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            수정
                          </ActionButton>
                          <ActionButton
                            onClick={() => void cancelLine(line.id)}
                            disabled={
                              !canEditOrder(selectedOrder) ||
                              line.status === 'CANCELLED' ||
                              actionLoading !== null
                            }
                            className="h-8 rounded-md border border-slate-300 px-2 text-xs hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            라인취소
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="mb-2 text-sm font-medium text-slate-700">오더 취소</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="form-input h-9 flex-1 px-3"
                  placeholder="취소 사유 (선택)"
                />
                <ActionButton
                  onClick={() => void cancelOrder()}
                  disabled={!canEditOrder(selectedOrder) || actionLoading !== null}
                >
                  오더 취소
                </ActionButton>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
