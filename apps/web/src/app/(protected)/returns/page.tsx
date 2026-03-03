'use client';

import { useMemo, useState } from 'react';
import { useAuthSession } from '@/features/auth';
import { buildDashboardMenus, DashboardShell } from '@/features/dashboard';
import { useReturnsPage } from '@/features/returns/hooks/use-returns-page';
import type { StorageType } from '@/features/returns/model/types';
import { ActionButton, StatusBadge } from '@/shared/ui/common';

export default function ReturnsPage() {
  const { me, loggingOut, signOut } = useAuthSession();
  const {
    customers,
    items,
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

  const customerDisplayName = (customer?: {
    name?: string;
    customerName?: string;
  } | null) => customer?.name ?? customer?.customerName ?? '-';

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

  return (
    <DashboardShell
      userName={me?.name ?? '사용자'}
      companyName={me?.companyName ?? '회사'}
      onLogout={signOut}
      loggingOut={loggingOut}
      menus={buildDashboardMenus(me?.role)}
    >
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">반품 접수 목록</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr_auto_auto]">
          <select
            value={newCustomerId}
            onChange={(e) => setNewCustomerId(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
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
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
          />
          <ActionButton
            onClick={() => setIsItemModalOpen(true)}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm hover:bg-slate-100"
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
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr]">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
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
            placeholder="접수번호 또는 고객사명 검색"
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </div>
        {loadingList ? (
          <p className="mt-3 text-sm text-slate-600">목록을 불러오는 중...</p>
        ) : filteredReceipts.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">반품 접수 내역이 없습니다.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="px-2 py-2">접수번호</th>
                  <th className="px-2 py-2">상태</th>
                  <th className="px-2 py-2">고객사</th>
                  <th className="px-2 py-2">접수일</th>
                  <th className="px-2 py-2">라인 수</th>
                  <th className="px-2 py-2">상세</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.map((receipt) => (
                  <tr key={receipt.id} className="border-t border-slate-100">
                    <td className="px-2 py-2 font-medium text-slate-700">
                      {returnDisplayNo(receipt)}
                    </td>
                    <td className="px-2 py-2">
                      <StatusBadge status={receipt.status} />
                    </td>
                    <td className="px-2 py-2">{customerDisplayName(receipt.customer)}</td>
                    <td className="px-2 py-2">
                      {new Date(receipt.receivedAt).toLocaleString()}
                    </td>
                    <td className="px-2 py-2">{receipt.lines.length}</td>
                    <td className="px-2 py-2">
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
                          className="h-8 rounded-md border border-slate-300 px-2 text-xs"
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
                          value={createItemQty[item.id] ?? ''}
                          onChange={(e) => setCreateQty(item.id, e.target.value)}
                          disabled={!createItemChecked[item.id]}
                          className="h-8 w-24 rounded-md border border-slate-300 px-2 text-xs"
                          placeholder="수량"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="date"
                          value={createItemExpiry[item.id] ?? ''}
                          onChange={(e) => setCreateExpiry(item.id, e.target.value)}
                          disabled={!createItemChecked[item.id]}
                          className="h-8 rounded-md border border-slate-300 px-2 text-xs"
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

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-800">반품 상세</h3>
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
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="px-2 py-2">품목코드</th>
                    <th className="px-2 py-2">품목명</th>
                    <th className="px-2 py-2">보관타입</th>
                    <th className="px-2 py-2">유통기한</th>
                    <th className="px-2 py-2">수량</th>
                    <th className="px-2 py-2">판정</th>
                    <th className="px-2 py-2">처리</th>
                    <th className="px-2 py-2">라인 작업</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.lines.map((line) => (
                    <tr key={line.id} className="border-t border-slate-100">
                      <td className="px-2 py-2">{line.item?.itemCode ?? '-'}</td>
                      <td className="px-2 py-2">{line.item?.itemName ?? '-'}</td>
                      <td className="px-2 py-2">{line.storageType}</td>
                      <td className="px-2 py-2">
                        {line.expiryDate
                          ? new Date(line.expiryDate).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="px-2 py-2">{String(line.qty)}</td>
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
                            className="h-8 rounded-md border border-slate-300 px-2 text-xs"
                          >
                            <option value="RESTOCK">RESTOCK</option>
                            <option value="DISCARD">DISCARD</option>
                          </select>
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
                            className="h-8 w-24 rounded-md border border-slate-300 px-2 text-xs"
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
    </DashboardShell>
  );
}
