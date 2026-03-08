'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthSession } from '@/features/auth';
import { exportReturns } from '@/features/returns/api/returns.api';
import { useReturnsPage } from '@/features/returns/hooks/use-returns-page';
import { useToast } from '@/shared/ui/toast/toast-provider';
import { getErrorMessage } from '@/shared/utils/get-error-message';
import type { StorageType } from '@/features/returns/model/types';
import { formatDecimalForDisplay } from '@/shared/utils/format-decimal';
import { ActionButton, SortableHeader, StatusBadge } from '@/shared/ui/common';

export default function ReturnsPage() {
  const searchParams = useSearchParams();
  const { me } = useAuthSession();
  const { showToast } = useToast();

  const handleExportReturns = useCallback(async () => {
    try {
      const blob = await exportReturns();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `returns-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('반품 엑셀 다운로드를 시작했습니다.', 'success');
    } catch (error) {
      showToast(getErrorMessage(error, '엑셀 다운로드에 실패했습니다.'), 'error');
    }
  }, [showToast]);

  const {
    customers,
    items,
    receipts,
    sortedFilteredReceipts,
    returnSortKey,
    returnSortDir,
    toggleReturnSort,
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
    canDecide,
    canProcess,
    canEditSelectedReceipt,
    decideDisabledReason,
    processDisabledReason,
    refreshList,
    loadDetail,
    setDecisionMap,
    setLineQtyMap,
    lineExpiryMap,
    setLineExpiryMap,
    updateLineExpiry,
    toggleProcessLine,
    createReceipt,
    updateLineQty,
    removeLine,
    cancelReceipt,
    submitDecide,
    submitProcess,
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
  } = useReturnsPage(me?.role);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  const customerDisplayName = useCallback(
    (customer?: { name?: string; customerName?: string } | null) =>
      customer?.name ?? customer?.customerName ?? '-',
    [],
  );

  const returnDisplayNo = (receipt: { receiptNo?: number; receivedAt: string }) => {
    if (typeof receipt.receiptNo === 'number') {
      return `RT-${String(receipt.receiptNo).padStart(6, '0')}`;
    }
    const date = new Date(receipt.receivedAt);
    const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(
      2,
      '0',
    )}${String(date.getDate()).padStart(2, '0')}`;
    const hms = `${String(date.getHours()).padStart(2, '0')}${String(
      date.getMinutes(),
    ).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}`;
    return `RT-${ymd}-${hms}`;
  };

  const filteredCreateItems = useMemo(() => {
    const key = itemSearch.trim().toLowerCase();
    const base = items.filter((item) => {
      if (!key) return true;
      return (
        item.itemCode.toLowerCase().includes(key) ||
        item.itemName.toLowerCase().includes(key)
      );
    });
    return showSelectedOnly
      ? base.filter((item) => Boolean(createItemChecked[item.id]))
      : base;
  }, [items, itemSearch, showSelectedOnly, createItemChecked]);

  const selectedItemCount = Object.values(createItemChecked).filter(Boolean).length;

  const presetStatuses = useMemo(() => {
    const statuses = searchParams.get('statuses');
    if (!statuses) return [];
    const validSet = new Set(['RECEIVED', 'DECIDED', 'COMPLETED', 'CANCELLED']);
    return statuses
      .split(',')
      .map((value) => value.trim())
      .filter((value) => validSet.has(value));
  }, [searchParams]);

  const displayedReceipts = useMemo(() => {
    if (presetStatuses.length === 0 || statusFilter) return sortedFilteredReceipts;
    const scope = new Set(presetStatuses);
    const base = receipts
      .filter((receipt) => scope.has(receipt.status))
      .filter((receipt) => {
        const key = keyword.trim().toLowerCase();
        const keyMatched = key
          ? receipt.id.toLowerCase().includes(key) ||
            String(receipt.receiptNo ?? '').includes(key) ||
            (receipt.customer?.name ?? receipt.customer?.customerName ?? '')
              .toLowerCase()
              .includes(key)
          : true;
        return keyMatched;
      });
    const factor = returnSortDir === 'asc' ? 1 : -1;
    return [...base].sort((a, b) => {
      switch (returnSortKey) {
        case 'receiptNo':
          return factor * ((a.receiptNo ?? 0) - (b.receiptNo ?? 0));
        case 'status':
          return factor * a.status.localeCompare(b.status);
        case 'receivedAt':
          return factor * (new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());
        case 'customer':
          return factor * customerDisplayName(a.customer).localeCompare(customerDisplayName(b.customer));
        case 'lineCount':
          return factor * (a.lines.length - b.lines.length);
        default:
          return 0;
      }
    });
  }, [
    customerDisplayName,
    keyword,
    presetStatuses,
    receipts,
    returnSortDir,
    returnSortKey,
    sortedFilteredReceipts,
    statusFilter,
  ]);

  useEffect(() => {
    const status = searchParams.get('status');
    if (
      status === 'RECEIVED' ||
      status === 'DECIDED' ||
      status === 'COMPLETED' ||
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
        <h2 className="page-title">반품 접수 목록</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr_auto_auto]">
          <select
            value={newCustomerId}
            onChange={(e) => setNewCustomerId(e.target.value)}
            className="form-select"
          >
            <option value="">고객사(선택)</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.customerName}
              </option>
            ))}
          </select>
          <input
            value={newMemo}
            onChange={(e) => setNewMemo(e.target.value)}
            placeholder="메모(선택)"
            className="form-input"
          />
          <ActionButton
            onClick={() => setIsItemModalOpen(true)}
            variant="secondary"
            size="lg"
          >
            품목 선택 ({selectedItemCount})
          </ActionButton>
          <ActionButton onClick={() => void createReceipt()} disabled={creating}>
            {creating ? '생성 중...' : '접수 생성'}
          </ActionButton>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          반품 접수도 품목을 모달에서 여러 개 선택해 한 번에 생성할 수 있습니다.
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr_auto_auto]">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-select"
          >
            <option value="">전체 상태</option>
            <option value="RECEIVED">RECEIVED</option>
            <option value="DECIDED">DECIDED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void refreshList();
            }}
            placeholder="접수번호 또는 고객사명 검색"
            className="form-input"
          />
          <ActionButton
            onClick={() => void refreshList()}
            disabled={loadingList}
            variant="secondary"
            size="lg"
          >
            {loadingList ? '조회 중...' : '조회'}
          </ActionButton>
          <ActionButton
            onClick={() => void handleExportReturns()}
            variant="secondary"
            size="lg"
          >
            엑셀 다운로드
          </ActionButton>
        </div>
        {loadingList ? (
          <p className="mt-3 text-sm text-slate-600">목록을 불러오는 중...</p>
        ) : displayedReceipts.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">반품 접수 내역이 없습니다.</p>
        ) : (
          <div className="table-wrapper mt-4">
            <table className="data-table min-w-[760px]">
              <thead>
                <tr>
                  <SortableHeader
                    label="접수번호"
                    sortKey="receiptNo"
                    currentSortKey={returnSortKey}
                    currentSortDir={returnSortDir}
                    onSort={toggleReturnSort}
                  />
                  <SortableHeader
                    label="상태"
                    sortKey="status"
                    currentSortKey={returnSortKey}
                    currentSortDir={returnSortDir}
                    onSort={toggleReturnSort}
                  />
                  <SortableHeader
                    label="고객사"
                    sortKey="customer"
                    currentSortKey={returnSortKey}
                    currentSortDir={returnSortDir}
                    onSort={toggleReturnSort}
                  />
                  <SortableHeader
                    label="접수일"
                    sortKey="receivedAt"
                    currentSortKey={returnSortKey}
                    currentSortDir={returnSortDir}
                    onSort={toggleReturnSort}
                  />
                  <SortableHeader
                    label="라인 수"
                    sortKey="lineCount"
                    currentSortKey={returnSortKey}
                    currentSortDir={returnSortDir}
                    onSort={toggleReturnSort}
                  />
                  <th>상세</th>
                </tr>
              </thead>
              <tbody>
                {displayedReceipts.map((receipt) => (
                  <tr key={receipt.id}>
                    <td className="font-medium text-slate-700">
                      {returnDisplayNo(receipt)}
                    </td>
                    <td>
                      <StatusBadge status={receipt.status} />
                    </td>
                    <td>{customerDisplayName(receipt.customer)}</td>
                    <td>
                      {new Date(receipt.receivedAt).toLocaleString()}
                    </td>
                    <td>{receipt.lines.length}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => void loadDetail(receipt.id)}
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
        </div>
      </section>

      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-5xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">반품 품목 선택</h3>
              <ActionButton
                onClick={() => setIsItemModalOpen(false)}
                className="h-8 rounded-md border border-slate-300 px-2 text-xs hover:bg-slate-100"
              >
                닫기
              </ActionButton>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
              <input
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
                placeholder="품목코드/품목명 검색"
              />
              <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm">
                <input
                  type="checkbox"
                  checked={showSelectedOnly}
                  onChange={(e) => setShowSelectedOnly(e.target.checked)}
                />
                선택된 품목만 보기
              </label>
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
            </div>
            <div className="mt-3 max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="px-2 py-2">선택</th>
                    <th className="px-2 py-2">품목코드</th>
                    <th className="px-2 py-2">품목명</th>
                    <th className="px-2 py-2">보관타입</th>
                    <th className="px-2 py-2">수량</th>
                    <th className="px-2 py-2">유통기한</th>
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
                      <td className="px-2 py-2">
                        <select
                          value={createItemStorageType[item.id] ?? 'DRY'}
                          onChange={(e) =>
                            setCreateStorageType(item.id, e.target.value as StorageType)
                          }
                          disabled={!createItemChecked[item.id]}
                          className="form-select h-8 px-2 text-xs"
                        >
                          <option value="DRY">DRY</option>
                          <option value="COOL">COOL</option>
                          <option value="FRZ">FRZ</option>
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={createItemQty[item.id] ?? '0'}
                          onChange={(e) => setCreateQty(item.id, e.target.value)}
                          disabled={!createItemChecked[item.id]}
                          className="form-input h-8 w-24 px-2 text-xs"
                          placeholder="수량"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="date"
                          value={createItemExpiry[item.id] ?? ''}
                          onChange={(e) => setCreateExpiry(item.id, e.target.value)}
                          disabled={!createItemChecked[item.id]}
                          className="form-input h-8 px-2 text-xs"
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
          <h3 className="page-subtitle">반품 상세</h3>
          <div className="flex flex-wrap gap-2">
            <ActionButton
              onClick={() => void cancelReceipt()}
              disabled={!canEditSelectedReceipt || actionLoading !== null}
            >
              {actionLoading === 'cancelReceipt' ? '처리 중...' : '접수 취소'}
            </ActionButton>
            <ActionButton
              onClick={() => void submitDecide()}
              disabled={!canDecide || actionLoading !== null}
              disabledReason={decideDisabledReason()}
            >
              {actionLoading === 'decide' ? '처리 중...' : '판정 확정'}
            </ActionButton>
            <ActionButton
              onClick={() => void submitProcess()}
              disabled={!canProcess || actionLoading !== null}
              disabledReason={processDisabledReason()}
            >
              {actionLoading === 'process' ? '처리 중...' : '재고 반영'}
            </ActionButton>
          </div>
        </div>

        {loadingDetail ? (
          <p className="mt-3 text-sm text-slate-600">상세를 불러오는 중...</p>
        ) : !selected ? (
          <p className="mt-3 text-sm text-slate-600">
            반품 접수 목록에서 상세 보기를 눌러주세요.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <p>접수번호: {returnDisplayNo(selected)}</p>
              <p>
                상태: <StatusBadge status={selected.status} />
              </p>
              <p>고객사: {customerDisplayName(selected.customer)}</p>
              <p>메모: {selected.memo ?? '-'}</p>
            </div>
            <div className="table-wrapper">
              <table className="data-table min-w-[980px]">
                <thead>
                  <tr>
                    <th>품목코드</th>
                    <th>품목명</th>
                    <th>보관타입</th>
                    <th>유통기한</th>
                    <th>수량</th>
                    <th>판정</th>
                    <th>처리</th>
                    <th>라인 작업</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.lines.map((line) => (
                    <tr key={line.id}>
                      <td>{line.item?.itemCode ?? '-'}</td>
                      <td>{line.item?.itemName ?? '-'}</td>
                      <td>{line.storageType}</td>
                      <td className="min-w-0">
                        {canEditSelectedReceipt ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="date"
                              value={lineExpiryMap[line.id] ?? ''}
                              onChange={(e) =>
                                setLineExpiryMap((prev) => ({
                                  ...prev,
                                  [line.id]: e.target.value,
                                }))
                              }
                              className="form-input h-8 px-2 text-xs"
                            />
                            <ActionButton
                              onClick={() => void updateLineExpiry(line.id)}
                              disabled={actionLoading !== null}
                              size="sm"
                              variant="secondary"
                            >
                              수정
                            </ActionButton>
                          </div>
                        ) : line.expiryDate ? (
                          new Date(line.expiryDate).toLocaleDateString()
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-2 py-2">{formatDecimalForDisplay(line.qty)}</td>
                      <td className="px-2 py-2">
                        {canDecide ? (
                          <select
                            value={decisionMap[line.id] ?? 'RESTOCK'}
                            onChange={(e) =>
                              setDecisionMap((prev) => ({
                                ...prev,
                                [line.id]: e.target.value as 'RESTOCK' | 'DISCARD',
                              }))
                            }
                            className="form-input h-8 px-2 text-xs"
                          >
                            <option value="RESTOCK">RESTOCK</option>
                            <option value="DISCARD">DISCARD</option>
                          </select>
                        ) : selected?.status === 'DECIDED' && line.decision ? (
                          <span>확정</span>
                        ) : (
                          <span>{line.decision ?? '-'}</span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {canProcess ? (
                          <input
                            type="checkbox"
                            checked={processLineIds.includes(line.id)}
                            onChange={() => toggleProcessLine(line.id)}
                            disabled={line.processedAt != null}
                          />
                        ) : (
                          <span>{line.processedAt ? '완료' : '-'}</span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={lineQtyMap[line.id] ?? String(line.qty)}
                            onChange={(e) =>
                              setLineQtyMap((prev) => ({ ...prev, [line.id]: e.target.value }))
                            }
                            disabled={!canEditSelectedReceipt}
                            className="form-input h-8 w-24 px-2 text-xs"
                          />
                          <ActionButton
                            onClick={() => void updateLineQty(line.id)}
                            disabled={!canEditSelectedReceipt || actionLoading !== null}
                            className="h-8 rounded-md border border-slate-300 px-2 text-xs hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            수정
                          </ActionButton>
                          <ActionButton
                            onClick={() => void removeLine(line.id)}
                            disabled={!canEditSelectedReceipt || actionLoading !== null}
                            className="h-8 rounded-md border border-slate-300 px-2 text-xs hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            라인삭제
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
