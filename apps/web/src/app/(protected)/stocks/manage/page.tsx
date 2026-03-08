'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuthSession } from '@/features/auth';
import { canAccessInbound } from '@/features/auth/model/role-policy';
import { useStocksPageWithOptions } from '@/features/stocks/hooks/use-stocks-page';
import type { StockRow, StorageType } from '@/features/stocks/model/types';
import { LotHistoryModal } from '@/features/traceability/components/lot-history-modal';
import { formatDecimalForDisplay } from '@/shared/utils/format-decimal';
import { ActionButton, SortableHeader } from '@/shared/ui/common';
import { useToast } from '@/shared/ui/toast/toast-provider';

function parseStorageType(value: string | null): '' | StorageType {
  if (value === 'DRY' || value === 'COOL' || value === 'FRZ') return value;
  return '';
}

function warehouseDisplay(type: string): string {
  return type;
}

type StockSortKey =
  | 'warehouseType'
  | 'itemCode'
  | 'itemName'
  | 'expiryDate'
  | 'onHand'
  | 'reserved'
  | 'available';

function parseSortKey(value: string | null): StockSortKey {
  if (
    value === 'warehouseType' ||
    value === 'itemCode' ||
    value === 'itemName' ||
    value === 'expiryDate' ||
    value === 'onHand' ||
    value === 'reserved' ||
    value === 'available'
  ) {
    return value;
  }
  return 'itemCode';
}

function parseSortDir(value: string | null): 'asc' | 'desc' {
  return value === 'desc' ? 'desc' : 'asc';
}

export default function StocksManagePage() {
  const { showToast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { me } = useAuthSession();
  const initialStorageType = useMemo(
    () => parseStorageType(searchParams.get('storageType')),
    [searchParams],
  );
  const initialItemCode = useMemo(() => searchParams.get('itemCode') ?? '', [searchParams]);
  const initialPage = useMemo(() => {
    const raw = Number(searchParams.get('page') ?? '1');
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
  }, [searchParams]);
  const initialPageSize = useMemo(() => {
    const raw = Number(searchParams.get('pageSize') ?? '50');
    if (!Number.isFinite(raw)) return 50;
    const normalized = Math.floor(raw);
    if (normalized === 20 || normalized === 50 || normalized === 100) return normalized;
    return 50;
  }, [searchParams]);
  const initialSortKey = useMemo<StockSortKey>(
    () => parseSortKey(searchParams.get('sortKey')),
    [searchParams],
  );
  const initialSortDir = useMemo<'asc' | 'desc'>(
    () => parseSortDir(searchParams.get('sortDir')),
    [searchParams],
  );
  const {
    rows,
    loading,
    storageType,
    itemCode,
    page,
    pageSize,
    total,
    totalPages,
    setStorageType,
    setItemCode,
    updatingStockId,
    setPageSize,
    loadStocks,
    updateStockRow,
    downloadStocksExcel,
    resetFiltersAndReload,
  } = useStocksPageWithOptions({
    storageType: initialStorageType,
    itemCode: initialItemCode,
    page: initialPage,
    pageSize: initialPageSize,
  });
  const [shortageOnly, setShortageOnly] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [sortKey, setSortKey] = useState<StockSortKey>(initialSortKey);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initialSortDir);
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [editingOnHand, setEditingOnHand] = useState('');
  const [editingReserved, setEditingReserved] = useState('');
  const [lotHistoryTarget, setLotHistoryTarget] = useState<{
    lotId: string;
    lotLabel: string;
  } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;

    if (storageType) {
      if (params.get('storageType') !== storageType) {
        params.set('storageType', storageType);
        changed = true;
      }
    } else if (params.has('storageType')) {
      params.delete('storageType');
      changed = true;
    }

    const normalizedItemCode = itemCode.trim();
    if (normalizedItemCode) {
      if (params.get('itemCode') !== normalizedItemCode) {
        params.set('itemCode', normalizedItemCode);
        changed = true;
      }
    } else if (params.has('itemCode')) {
      params.delete('itemCode');
      changed = true;
    }

    if (params.get('page') !== String(page)) {
      params.set('page', String(page));
      changed = true;
    }
    if (params.get('pageSize') !== String(pageSize)) {
      params.set('pageSize', String(pageSize));
      changed = true;
    }
    if (params.get('sortKey') !== sortKey) {
      params.set('sortKey', sortKey);
      changed = true;
    }
    if (params.get('sortDir') !== sortDir) {
      params.set('sortDir', sortDir);
      changed = true;
    }

    if (shortageOnly) {
      if (params.get('shortageOnly') !== '1') {
        params.set('shortageOnly', '1');
        changed = true;
      }
    } else if (params.has('shortageOnly')) {
      params.delete('shortageOnly');
      changed = true;
    }

    if (!changed) return;
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [itemCode, page, pageSize, pathname, router, searchParams, shortageOnly, sortDir, sortKey, storageType]);

  const displayedRows = useMemo(
    () => (shortageOnly ? rows.filter((row) => row.onHand - row.reserved < 0) : rows),
    [rows, shortageOnly],
  );
  const sortedRows = useMemo(() => {
    const rowsCopy = [...displayedRows];
    const factor = sortDir === 'asc' ? 1 : -1;
    rowsCopy.sort((a, b) => {
      const availableA = a.onHand - a.reserved;
      const availableB = b.onHand - b.reserved;
      switch (sortKey) {
        case 'warehouseType':
          return factor * a.warehouse.type.localeCompare(b.warehouse.type);
        case 'itemCode':
          return factor * a.lot.item.itemCode.localeCompare(b.lot.item.itemCode);
        case 'itemName':
          return factor * a.lot.item.itemName.localeCompare(b.lot.item.itemName);
        case 'expiryDate': {
          const ea = a.lot.expiryDate ?? '';
          const eb = b.lot.expiryDate ?? '';
          return factor * ea.localeCompare(eb);
        }
        case 'onHand':
          return factor * (a.onHand - b.onHand);
        case 'reserved':
          return factor * (a.reserved - b.reserved);
        case 'available':
          return factor * (availableA - availableB);
        default:
          return 0;
      }
    });
    return rowsCopy;
  }, [displayedRows, sortDir, sortKey]);

  function toggleSort(key: StockSortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir('asc');
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 767px)');
    const apply = () => setIsMobile(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    const target = loadMoreRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (loading) return;
        if (page >= totalPages) return;
        void loadStocks({ nextPage: page + 1, append: true });
      },
      { rootMargin: '80px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [isMobile, loadStocks, loading, page, totalPages]);

  function beginEdit(row: StockRow) {
    setEditingStockId(row.id);
    setEditingOnHand((Math.round(row.onHand * 10) / 10).toFixed(1));
    setEditingReserved((Math.round(row.reserved * 10) / 10).toFixed(1));
  }

  async function saveEdit(row: StockRow) {
    const onHand = Number(editingOnHand);
    const reserved = Number(editingReserved);
    if (!Number.isFinite(onHand) || onHand < 0) {
      showToast('현재고는 0 이상의 숫자여야 합니다.', 'error');
      return;
    }
    if (!Number.isFinite(reserved) || reserved < 0) {
      showToast('예약 수량은 0 이상의 숫자여야 합니다.', 'error');
      return;
    }
    await updateStockRow({
      stockId: row.id,
      onHand,
      reserved,
      memo: '재고 관리 화면 수동 수정',
    });
    setEditingStockId(null);
  }

  const paginationPages = useMemo(() => {
    if (totalPages <= 1) return [] as number[];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + 4);
    const adjustedStart = Math.max(1, end - 4);
    return Array.from({ length: end - adjustedStart + 1 }, (_, idx) => adjustedStart + idx);
  }, [page, totalPages]);

  return (
    <>
      <section className="page-section">
        <h2 className="page-title">재고 관리</h2>
        <p className="page-description">
          현재고·예약수량을 조정합니다. ADMIN, WH_MANAGER만 접근 가능합니다.
        </p>

        <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
          <Link href="/stocks" className="underline hover:text-slate-800">
            ← 재고 조회
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 items-center gap-3 sm:grid-cols-[160px_1fr_auto] sm:gap-4">
          <select
            value={storageType}
            onChange={(e) => {
              const next = e.target.value as '' | 'DRY' | 'COOL' | 'FRZ';
              setStorageType(next);
              void loadStocks({ nextPage: 1, storageType: next });
            }}
            className="form-select"
          >
            <option value="">전체 창고</option>
            <option value="DRY">DRY</option>
            <option value="COOL">COOL</option>
            <option value="FRZ">FRZ</option>
          </select>
          <input
            value={itemCode}
            onChange={(e) => setItemCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                void loadStocks();
              }
            }}
            placeholder="품목코드 (예: A001)"
            className="form-input min-w-0"
          />
          <div className="col-span-2 flex gap-2 sm:col-span-1 sm:justify-end">
            <ActionButton
              onClick={() => void loadStocks({ nextPage: 1 })}
              disabled={loading}
              size="md"
              variant="secondary"
            >
              {loading ? '조회 중...' : '조회'}
            </ActionButton>
            <ActionButton
              onClick={() => void resetFiltersAndReload()}
              disabled={loading}
              size="md"
              variant="secondary"
            >
              초기화
            </ActionButton>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={shortageOnly}
              onChange={(e) => setShortageOnly(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            부족만 보기 (가용 &lt; 0)
          </label>
          {!loading ? (
            <p className="text-xs text-slate-500">
              총 {total}건{shortageOnly ? ` / 현재 페이지 부족 ${displayedRows.length}건` : ''}
            </p>
          ) : null}
        </div>

        <div className="table-wrapper mt-5">
          <table className="data-table min-w-[840px]">
            <thead>
              <tr>
                <SortableHeader
                  label="창고"
                  sortKey="warehouseType"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={(k) => toggleSort(k as StockSortKey)}
                />
                <SortableHeader
                  label="품목코드"
                  sortKey="itemCode"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={(k) => toggleSort(k as StockSortKey)}
                />
                <SortableHeader
                  label="품목명"
                  sortKey="itemName"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={(k) => toggleSort(k as StockSortKey)}
                />
                <SortableHeader
                  label="유통기한"
                  sortKey="expiryDate"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={(k) => toggleSort(k as StockSortKey)}
                />
                <SortableHeader
                  label="현재고"
                  sortKey="onHand"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={(k) => toggleSort(k as StockSortKey)}
                />
                <SortableHeader
                  label="예약"
                  sortKey="reserved"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={(k) => toggleSort(k as StockSortKey)}
                />
                <SortableHeader
                  label="가용"
                  sortKey="available"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={(k) => toggleSort(k as StockSortKey)}
                />
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">이력</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {!loading &&
                sortedRows.map((row) => {
                  const available = row.onHand - row.reserved;
                  const isNegativeAvailable = available < 0;
                  return (
                    <tr key={row.id}>
                      <td className="px-4 py-3">
                        {warehouseDisplay(row.warehouse.type)}
                      </td>
                      <td className="px-4 py-3">{row.lot.item.itemCode}</td>
                      <td className="px-4 py-3">{row.lot.item.itemName}</td>
                      <td className="px-4 py-3">
                        {row.lot.expiryDate
                          ? new Date(row.lot.expiryDate).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {editingStockId === row.id ? (
                          <input
                            value={editingOnHand}
                            onChange={(e) => setEditingOnHand(e.target.value)}
                            type="number"
                            step="0.1"
                            min="0"
                            className="form-input h-8 w-24 px-2 text-xs"
                          />
                        ) : (
                          formatDecimalForDisplay(row.onHand)
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingStockId === row.id ? (
                          <input
                            value={editingReserved}
                            onChange={(e) => setEditingReserved(e.target.value)}
                            type="number"
                            step="0.1"
                            min="0"
                            className="form-input h-8 w-24 px-2 text-xs"
                          />
                        ) : (
                          formatDecimalForDisplay(row.reserved)
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            isNegativeAvailable
                              ? 'rounded bg-red-50 px-1.5 py-0.5 font-medium text-red-700'
                              : ''
                          }
                        >
                          {formatDecimalForDisplay(available)}
                        </span>
                        {isNegativeAvailable ? (
                          <span className="ml-1 rounded border border-red-200 bg-red-50 px-1 py-0.5 text-[10px] text-red-700">
                            부족
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <ActionButton
                          onClick={() =>
                            setLotHistoryTarget({
                              lotId: row.lot.id,
                              lotLabel: `${row.lot.item.itemCode} · ${row.lot.item.itemName}`,
                            })
                          }
                          size="sm"
                          variant="secondary"
                        >
                          이력
                        </ActionButton>
                      </td>
                      <td className="px-4 py-3">
                        {editingStockId === row.id ? (
                          <div className="flex gap-1">
                            <ActionButton
                              onClick={() => void saveEdit(row)}
                              disabled={updatingStockId === row.id}
                              size="sm"
                              variant="secondary"
                            >
                              {updatingStockId === row.id ? '저장 중' : '저장'}
                            </ActionButton>
                            <ActionButton
                              onClick={() => setEditingStockId(null)}
                              disabled={updatingStockId === row.id}
                              size="sm"
                              variant="secondary"
                            >
                              취소
                            </ActionButton>
                          </div>
                        ) : (
                          <ActionButton
                            onClick={() => beginEdit(row)}
                            size="sm"
                            variant="secondary"
                          >
                            수정
                          </ActionButton>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {!loading && displayedRows.length === 0 && (
            <div className="mt-4 flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-6 py-8 text-center">
              <p className="text-sm text-slate-600">조건에 맞는 재고가 없습니다.</p>
              {canAccessInbound(me?.role) && (
                <Link
                  href="/inbound"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  입고 진행하기
                </Link>
              )}
            </div>
          )}
          {loading && (
            <p className="mt-3 text-sm text-slate-600">재고를 불러오는 중...</p>
          )}
          {!isMobile && totalPages > 1 ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-600">페이지당</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const nextSize = Number(e.target.value);
                    setPageSize(nextSize);
                    void loadStocks({ nextPage: 1, nextPageSize: nextSize });
                  }}
                  className="form-select h-8 px-2 text-sm"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <ActionButton
                  onClick={() => void loadStocks({ nextPage: page - 1 })}
                  disabled={loading || page <= 1}
                  className="h-8 rounded border border-slate-300 px-2 text-xs hover:bg-slate-100 disabled:opacity-50"
                >
                  이전
                </ActionButton>
                {paginationPages[0] && paginationPages[0] > 1 ? (
                  <>
                    <ActionButton
                      onClick={() => void loadStocks({ nextPage: 1 })}
                      disabled={loading}
                      className="h-8 rounded border border-slate-300 px-2 text-xs hover:bg-slate-100 disabled:opacity-50"
                    >
                      1
                    </ActionButton>
                    {paginationPages[0] > 2 ? <span className="px-1 text-slate-400">...</span> : null}
                  </>
                ) : null}
                {paginationPages.map((pageNo) => (
                  <ActionButton
                    key={pageNo}
                    onClick={() => void loadStocks({ nextPage: pageNo })}
                    disabled={loading || pageNo === page}
                    className={`h-8 rounded border px-2 text-xs disabled:opacity-50 ${
                      pageNo === page
                        ? 'border-slate-800 bg-slate-800 text-white'
                        : 'border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {pageNo}
                  </ActionButton>
                ))}
                {paginationPages[paginationPages.length - 1] &&
                paginationPages[paginationPages.length - 1] < totalPages ? (
                  <>
                    {paginationPages[paginationPages.length - 1] < totalPages - 1 ? (
                      <span className="px-1 text-slate-400">...</span>
                    ) : null}
                    <ActionButton
                      onClick={() => void loadStocks({ nextPage: totalPages })}
                      disabled={loading}
                      className="h-8 rounded border border-slate-300 px-2 text-xs hover:bg-slate-100 disabled:opacity-50"
                    >
                      {totalPages}
                    </ActionButton>
                  </>
                ) : null}
                <ActionButton
                  onClick={() => void loadStocks({ nextPage: page + 1 })}
                  disabled={loading || page >= totalPages}
                  className="h-8 rounded border border-slate-300 px-2 text-xs hover:bg-slate-100 disabled:opacity-50"
                >
                  다음
                </ActionButton>
                <span className="ml-1 text-slate-600">
                  {page} / {totalPages}
                </span>
              </div>
            </div>
          ) : null}
          {isMobile ? (
            <div ref={loadMoreRef} className="mt-3 py-2 text-center text-xs text-slate-500">
              {page < totalPages ? '아래로 스크롤하면 더 불러옵니다.' : '마지막 페이지입니다.'}
            </div>
          ) : null}
        </div>
        <div className="mt-5">
          <ActionButton
            onClick={() => void downloadStocksExcel()}
            variant="secondary"
            size="md"
          >
            재고 전체 엑셀 다운로드
          </ActionButton>
        </div>
      </section>

      {lotHistoryTarget && (
        <LotHistoryModal
          lotId={lotHistoryTarget.lotId}
          lotLabel={lotHistoryTarget.lotLabel}
          onClose={() => setLotHistoryTarget(null)}
        />
      )}
    </>
  );
}
