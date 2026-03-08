'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthSession } from '@/features/auth';
import { canAccessInbound } from '@/features/auth/model/role-policy';
import {
  createStocktaking,
  listStocktaking,
  getStocktaking,
  addStocktakingLines,
  updateStocktakingLineActualQty,
  confirmStocktaking,
  getWarehouses,
} from '@/features/stocktaking/api/stocktaking.api';
import { getStocks } from '@/features/stocks/api/stocks.api';
import type { Stocktaking, StocktakingListItem } from '@/features/stocktaking/api/stocktaking.api';
import { formatDecimalForDisplay } from '@/shared/utils/format-decimal';
import { ActionButton, StatusBadge } from '@/shared/ui/common';
import { useToast } from '@/shared/ui/toast/toast-provider';
import { getErrorMessage } from '@/shared/utils/get-error-message';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: '계획',
  IN_PROGRESS: '실사 중',
  CONFIRMED: '확정',
  CANCELLED: '취소',
};

export default function StocktakingPage() {
  const router = useRouter();
  const { me } = useAuthSession();
  const { showToast } = useToast();
  const canAccess = canAccessInbound(me?.role);

  const [list, setList] = useState<StocktakingListItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [selected, setSelected] = useState<Stocktaking | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [createWarehouseId, setCreateWarehouseId] = useState('');
  const [createMemo, setCreateMemo] = useState('');
  const [creating, setCreating] = useState(false);

  const [addLinesWarehouseStocks, setAddLinesWarehouseStocks] = useState<
    Array<{ id: string; lotId: string; onHand: number; lot: { id: string; itemCode: string; itemName: string; expiryDate: string | null } }>
  >([]);
  const [addLinesSelected, setAddLinesSelected] = useState<Set<string>>(new Set());
  const [addingLines, setAddingLines] = useState(false);

  const [lineActualQtyMap, setLineActualQtyMap] = useState<Record<string, string>>({});

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await listStocktaking({
        status: statusFilter || undefined,
        pageSize: 100,
      });
      setList(res.items);
    } catch (err) {
      showToast(getErrorMessage(err, '목록 조회에 실패했습니다.'), 'error');
    } finally {
      setLoadingList(false);
    }
  }, [statusFilter, showToast]);

  const loadDetail = useCallback(
    async (id: string) => {
      setLoadingDetail(true);
      setSelected(null);
      try {
        const st = await getStocktaking(id);
        setSelected(st);
        const map: Record<string, string> = {};
        st.lines.forEach((l) => {
          if (l.actualQty != null) map[l.id] = String(l.actualQty);
          else map[l.id] = '';
        });
        setLineActualQtyMap(map);
      } catch (err) {
        showToast(getErrorMessage(err, '상세 조회에 실패했습니다.'), 'error');
      } finally {
        setLoadingDetail(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    if (me && !canAccess) {
      router.replace('/stocks');
    }
  }, [canAccess, me, router]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    let cancelled = false;
    getWarehouses()
      .then((data) => {
        if (!cancelled) setWarehouses(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = async () => {
    if (!createWarehouseId) {
      showToast('창고를 선택해주세요.', 'error');
      return;
    }
    setCreating(true);
    try {
      const st = await createStocktaking({
        warehouseId: createWarehouseId,
        memo: createMemo.trim() || undefined,
      });
      showToast('재고 실사 계획을 생성했습니다.', 'success');
      setCreateWarehouseId('');
      setCreateMemo('');
      await loadList();
      await loadDetail(st.id);
    } catch (err) {
      showToast(getErrorMessage(err, '생성에 실패했습니다.'), 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleLoadAvailableLots = async () => {
    if (!selected) return;
    try {
      const res = await getStocks({
        warehouseId: selected.warehouseId,
        pageSize: 500,
      });
      setAddLinesWarehouseStocks(
        res.items.map((r) => ({
          id: r.id,
          lotId: r.lot.id,
          onHand: r.onHand,
          lot: {
            id: r.lot.id,
            itemCode: r.lot.item.itemCode,
            itemName: r.lot.item.itemName,
            expiryDate: r.lot.expiryDate,
          },
        })),
      );
      const existingLotIds = new Set(selected.lines.map((l) => l.lotId));
      setAddLinesSelected(new Set(res.items.filter((r) => !existingLotIds.has(r.lot.id)).map((r) => r.lot.id)));
    } catch (err) {
      showToast(getErrorMessage(err, '창고 재고 조회에 실패했습니다.'), 'error');
    }
  };

  const handleAddLines = async () => {
    if (!selected || addLinesSelected.size === 0) {
      showToast('추가할 Lot을 선택해주세요.', 'error');
      return;
    }
    setAddingLines(true);
    setActionLoading('addLines');
    try {
      const st = await addStocktakingLines(
        selected.id,
        Array.from(addLinesSelected).map((lotId) => ({ lotId })),
      );
      setSelected(st);
      setAddLinesSelected(new Set());
      setAddLinesWarehouseStocks([]);
      const map: Record<string, string> = {};
      st.lines.forEach((l) => {
        if (l.actualQty != null) map[l.id] = String(l.actualQty);
        else map[l.id] = '';
      });
      setLineActualQtyMap(map);
      showToast('라인을 추가했습니다.', 'success');
      await loadList();
    } catch (err) {
      showToast(getErrorMessage(err, '라인 추가에 실패했습니다.'), 'error');
    } finally {
      setAddingLines(false);
      setActionLoading(null);
    }
  };

  const handleUpdateLineActualQty = async (lineId: string) => {
    if (!selected) return;
    const raw = lineActualQtyMap[lineId];
    const qty = Number(raw);
    if (!Number.isFinite(qty) || qty < 0) {
      showToast('실사 수량은 0 이상의 숫자여야 합니다.', 'error');
      return;
    }
    setActionLoading(`update-${lineId}`);
    try {
      const st = await updateStocktakingLineActualQty(selected.id, lineId, qty);
      setSelected(st);
      setLineActualQtyMap((prev) => ({ ...prev, [lineId]: String(qty) }));
      showToast('실사 수량을 저장했습니다.', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, '저장에 실패했습니다.'), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirm = async () => {
    if (!selected) return;
    const linesWithActual = selected.lines.filter((l) => l.actualQty != null);
    if (linesWithActual.length === 0) {
      showToast('실사 수량이 입력된 라인이 없습니다.', 'error');
      return;
    }
    setActionLoading('confirm');
    try {
      const st = await confirmStocktaking(selected.id);
      setSelected(st);
      showToast('재고 실사를 확정했습니다. 재고가 반영되었습니다.', 'success');
      await loadList();
    } catch (err) {
      showToast(getErrorMessage(err, '확정에 실패했습니다.'), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const canAddLines = selected?.status === 'DRAFT' || selected?.status === 'IN_PROGRESS';
  const canEditActualQty = selected?.status === 'IN_PROGRESS';
  const canConfirm = selected?.status === 'IN_PROGRESS';

  return (
    <>
      <section className="page-section">
        <h2 className="page-title">재고 실사</h2>
        <p className="page-description">
          창고별 재고 실사 계획을 생성하고, Lot 단위로 실사 수량을 입력한 뒤 확정합니다.
        </p>

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-700">계획 생성</h3>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <select
              value={createWarehouseId}
              onChange={(e) => setCreateWarehouseId(e.target.value)}
              className="form-select w-48"
            >
              <option value="">창고 선택</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.type})
                </option>
              ))}
            </select>
            <input
              value={createMemo}
              onChange={(e) => setCreateMemo(e.target.value)}
              placeholder="메모 (선택)"
              className="form-input w-48"
            />
            <ActionButton
              onClick={() => void handleCreate()}
              disabled={creating || !createWarehouseId}
            >
              {creating ? '생성 중...' : '실사 계획 생성'}
            </ActionButton>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-select w-40"
          >
            <option value="">전체 상태</option>
            <option value="DRAFT">DRAFT</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        {loadingList ? (
          <p className="mt-4 text-sm text-slate-600">목록을 불러오는 중...</p>
        ) : list.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">재고 실사 내역이 없습니다.</p>
        ) : (
          <div className="table-wrapper mt-4">
            <table className="data-table min-w-[600px]">
              <thead>
                <tr>
                  <th>창고</th>
                  <th>상태</th>
                  <th>라인 수</th>
                  <th>생성일</th>
                  <th>상세</th>
                </tr>
              </thead>
              <tbody>
                {list.map((st) => (
                  <tr key={st.id}>
                    <td>
                      {st.warehouse.name} ({st.warehouse.type})
                    </td>
                    <td>
                      <StatusBadge status={st.status} />
                    </td>
                    <td>{st._count.lines}</td>
                    <td>{new Date(st.createdAt).toLocaleDateString()}</td>
                    <td>
                      <ActionButton
                        onClick={() => void loadDetail(st.id)}
                        size="sm"
                        variant="secondary"
                      >
                        보기
                      </ActionButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="page-section">
        <h3 className="page-subtitle">실사 상세</h3>
        {loadingDetail ? (
          <p className="mt-3 text-sm text-slate-600">상세를 불러오는 중...</p>
        ) : !selected ? (
          <p className="mt-3 text-sm text-slate-600">목록에서 상세 보기를 눌러주세요.</p>
        ) : (
          <div className="mt-3 space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <p>
                창고: {selected.warehouse.name} ({selected.warehouse.type})
              </p>
              <p>상태: {STATUS_LABELS[selected.status] ?? selected.status}</p>
              <p>메모: {selected.memo ?? '-'}</p>
            </div>

            {canAddLines && (
              <div className="rounded-lg border border-slate-200 p-4">
                <h4 className="text-sm font-semibold text-slate-700">라인 추가</h4>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <ActionButton
                    onClick={() => void handleLoadAvailableLots()}
                    variant="secondary"
                    size="sm"
                  >
                    창고 재고 불러오기
                  </ActionButton>
                  {addLinesWarehouseStocks.length > 0 && (
                    <>
                      <ActionButton
                        onClick={() => void handleAddLines()}
                        disabled={addingLines || addLinesSelected.size === 0}
                      >
                        {addingLines ? '추가 중...' : `선택 추가 (${addLinesSelected.size})`}
                      </ActionButton>
                      <div className="max-h-40 overflow-y-auto rounded border border-slate-200 p-2 text-xs">
                        {addLinesWarehouseStocks.map((s) => (
                          <label key={s.lotId} className="flex items-center gap-2 py-1">
                            <input
                              type="checkbox"
                              checked={addLinesSelected.has(s.lotId)}
                              onChange={(e) => {
                                setAddLinesSelected((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(s.lotId);
                                  else next.delete(s.lotId);
                                  return next;
                                });
                              }}
                            />
                            {s.lot.itemCode} · {s.lot.itemName} · 시스템 {formatDecimalForDisplay(s.onHand)}
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="table-wrapper">
              <table className="data-table min-w-[800px]">
                <thead>
                  <tr>
                    <th>품목코드</th>
                    <th>품목명</th>
                    <th>유통기한</th>
                    <th>시스템 수량</th>
                    <th>실사 수량</th>
                    <th>차이</th>
                    {canEditActualQty && <th>저장</th>}
                  </tr>
                </thead>
                <tbody>
                  {selected.lines.map((line) => {
                    const sysQty = Number(line.systemQty);
                    const actRaw = lineActualQtyMap[line.id] ?? '';
                    const actQty = actRaw === '' ? null : Number(actRaw);
                    const diff = actQty != null ? actQty - sysQty : null;
                    return (
                      <tr key={line.id}>
                        <td>{line.lot?.item?.itemCode ?? '-'}</td>
                        <td>{line.lot?.item?.itemName ?? '-'}</td>
                        <td>
                          {line.lot?.expiryDate
                            ? new Date(line.lot.expiryDate).toLocaleDateString()
                            : '-'}
                        </td>
                        <td>{formatDecimalForDisplay(sysQty)}</td>
                        <td>
                          {canEditActualQty ? (
                            <input
                              type="number"
                              min="0"
                              step="0.001"
                              value={actRaw}
                              onChange={(e) =>
                                setLineActualQtyMap((prev) => ({
                                  ...prev,
                                  [line.id]: e.target.value,
                                }))
                              }
                              className="form-input h-8 w-24 px-2 text-xs"
                            />
                          ) : line.actualQty != null ? (
                            formatDecimalForDisplay(Number(line.actualQty))
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>
                          {diff != null ? (
                            <span
                              className={
                                diff > 0
                                  ? 'text-emerald-600'
                                  : diff < 0
                                    ? 'text-amber-600'
                                    : 'text-slate-500'
                              }
                            >
                              {diff > 0 ? '+' : ''}
                              {formatDecimalForDisplay(diff)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        {canEditActualQty && (
                          <td>
                            <ActionButton
                              onClick={() => void handleUpdateLineActualQty(line.id)}
                              disabled={actionLoading !== null}
                              size="sm"
                              variant="secondary"
                            >
                              {actionLoading === `update-${line.id}` ? '저장 중' : '저장'}
                            </ActionButton>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {selected.lines.length === 0 && (
                <p className="py-4 text-center text-sm text-slate-500">
                  라인이 없습니다. 창고 재고 불러오기 후 Lot을 선택해 추가하세요.
                </p>
              )}
            </div>

            {canConfirm && (
              <div className="flex justify-end">
                <ActionButton
                  onClick={() => void handleConfirm()}
                  disabled={
                    actionLoading !== null ||
                    selected.lines.filter((l) => l.actualQty != null).length === 0
                  }
                >
                  {actionLoading === 'confirm' ? '확정 중...' : '실사 확정'}
                </ActionButton>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}
