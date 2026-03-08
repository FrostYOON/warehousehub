'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuthSession } from '@/features/auth';
import { canAccessInbound } from '@/features/auth/model/role-policy';
import { useStocksPageWithOptions } from '@/features/stocks/hooks/use-stocks-page';
import type { ExpirySoonDays, ItemAnalyticsRange, StockRow, StorageType } from '@/features/stocks/model/types';
import { LotHistoryModal } from '@/features/traceability/components/lot-history-modal';
import { formatDecimalForDisplay } from '@/shared/utils/format-decimal';
import { ActionButton, SortableHeader } from '@/shared/ui/common';

function formatRate(rate: number): string {
  const r = Math.round(rate * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

function parseStorageType(value: string | null): '' | StorageType {
  if (value === 'DRY' || value === 'COOL' || value === 'FRZ') return value;
  return '';
}

function warehouseDisplay(type: string): string {
  return type; // DRY, COOL, FRZ 모두 타입만 표시
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

function parseExpirySoon(value: string | null): ExpirySoonDays | undefined {
  const n = Number(value);
  if ([7, 14, 30, 60, 90].includes(n)) return n as ExpirySoonDays;
  return undefined;
}

export default function StocksPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { me } = useAuthSession();
  const initialRange = useMemo<ItemAnalyticsRange>(() => {
    const q = searchParams.get('range');
    if (q === 'WEEK' || q === 'QUARTER' || q === 'HALF' || q === 'YEAR') return q;
    return 'WEEK';
  }, [searchParams]);
  const initialItemId = useMemo(() => searchParams.get('analysisItemId') ?? '', [searchParams]);
  const initialStorageType = useMemo(
    () => parseStorageType(searchParams.get('storageType')),
    [searchParams],
  );
  const initialItemCode = useMemo(() => searchParams.get('itemCode') ?? '', [searchParams]);
  const initialExpirySoon = useMemo(
    () => parseExpirySoon(searchParams.get('expirySoon')),
    [searchParams],
  );
  const initialShortageOnly = useMemo(
    () => searchParams.get('shortageOnly') === '1',
    [searchParams],
  );
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
    analysisLoading,
    storageType,
    itemCode,
    expirySoon,
    setExpirySoon,
    analysisItems,
    analysisItemId,
    analysisRange,
    analysisTrend,
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
    downloadStocksExcel,
    resetFiltersAndReload,
  } = useStocksPageWithOptions({
    analysisItemId: initialItemId,
    analysisRange: initialRange,
    storageType: initialStorageType,
    itemCode: initialItemCode,
    expirySoon: initialExpirySoon,
    page: initialPage,
    pageSize: initialPageSize,
  });
  const [shortageOnly, setShortageOnly] = useState(initialShortageOnly);
  const [isMobile, setIsMobile] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [sortKey, setSortKey] = useState<StockSortKey>(initialSortKey);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initialSortDir);
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

    if (analysisItemId) {
      if (params.get('analysisItemId') !== analysisItemId) {
        params.set('analysisItemId', analysisItemId);
        changed = true;
      }
    } else if (params.has('analysisItemId')) {
      params.delete('analysisItemId');
      changed = true;
    }

    if (params.get('range') !== analysisRange) {
      params.set('range', analysisRange);
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

    const expirySoonStr = expirySoon != null ? String(expirySoon) : '';
    if (params.get('expirySoon') !== expirySoonStr) {
      if (expirySoonStr) params.set('expirySoon', expirySoonStr);
      else params.delete('expirySoon');
      changed = true;
    }

    if (!changed) return;
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [
    analysisItemId,
    analysisRange,
    itemCode,
    expirySoon,
    page,
    pageSize,
    pathname,
    router,
    searchParams,
    shortageOnly,
    sortDir,
    sortKey,
    storageType,
  ]);

  const maxBucketValue = useMemo(() => {
    const maxValue =
      analysisTrend?.buckets.reduce((max, bucket) => {
        return Math.max(max, bucket.outboundQty, bucket.returnQty);
      }, 0) ?? 0;
    return maxValue > 0 ? maxValue : 1;
  }, [analysisTrend]);

  const rangeLabel: Record<ItemAnalyticsRange, string> = {
    WEEK: '주간',
    QUARTER: '분기',
    HALF: '반기',
    YEAR: '연간',
  };
  const paginationPages = useMemo(() => {
    if (totalPages <= 1) return [] as number[];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + 4);
    const adjustedStart = Math.max(1, end - 4);
    return Array.from({ length: end - adjustedStart + 1 }, (_, idx) => adjustedStart + idx);
  }, [page, totalPages]);
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

  return (
    <>
      <section className="page-section">
        <h2 className="page-title">재고 조회</h2>
        <p className="page-description">
          창고 타입/품목코드로 필터링해 현재고, 예약수량, 가용수량을 확인합니다.
        </p>

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
              onClick={() => {
                void resetFiltersAndReload();
              }}
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
                        {formatDecimalForDisplay(row.onHand)}
                      </td>
                      <td className="px-4 py-3">
                        {formatDecimalForDisplay(row.reserved)}
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
                        <div className="flex gap-1">
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
                          <Link
                            href={`/traceability/lot/${row.lot.id}`}
                            className="inline-flex items-center rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            상세
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {!loading && displayedRows.length === 0 && (
            <div className="empty-state mt-4">
              <p className="empty-state-text">조건에 맞는 재고가 없습니다.</p>
              {canAccessInbound(me?.role) && (
                <Link
                  href="/inbound"
                  className="btn-primary mt-2"
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

      <section className="page-section">
        <h2 className="page-title">아이템별 출고/리턴 분석</h2>
        <p className="page-description">
          아이템 단위로 기간별 출고량, 리턴량, 리턴율을 함께 확인합니다.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
          <select
            value={analysisItemId}
            onChange={(e) => setAnalysisItemId(e.target.value)}
            className="form-select w-full sm:w-[200px]"
          >
            <option value="">아이템 선택</option>
            {analysisItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.itemCode} - {item.itemName}
              </option>
            ))}
          </select>
          <select
            value={analysisRange}
            onChange={(e) => setAnalysisRange(e.target.value as ItemAnalyticsRange)}
            className="form-select w-full sm:w-[120px]"
          >
            <option value="WEEK">주간</option>
            <option value="QUARTER">분기</option>
            <option value="HALF">반기</option>
            <option value="YEAR">연간</option>
          </select>
          <ActionButton
            onClick={() => void loadAnalysisTrend()}
            disabled={analysisLoading || !analysisItemId}
            variant="secondary"
            size="md"
          >
            {analysisLoading ? '분석 중...' : '분석 갱신'}
          </ActionButton>
        </div>

        {!analysisItemId ? (
          <p className="mt-3 text-sm text-slate-600">분석할 아이템을 선택해주세요.</p>
        ) : analysisLoading ? (
          <p className="mt-3 text-sm text-slate-600">분석 데이터를 불러오는 중...</p>
        ) : !analysisTrend ? (
          <p className="mt-3 text-sm text-slate-600">분석 데이터가 없습니다.</p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{rangeLabel[analysisTrend.range]} 출고량</p>
                <p className="mt-1 text-xl font-semibold text-slate-800">
                  {formatDecimalForDisplay(analysisTrend.totals.outboundQty)}
                </p>
              </article>
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{rangeLabel[analysisTrend.range]} 리턴량</p>
                <p className="mt-1 text-xl font-semibold text-slate-800">
                  {formatDecimalForDisplay(analysisTrend.totals.returnQty)}
                </p>
              </article>
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">리턴율</p>
                <p className="mt-1 text-xl font-semibold text-slate-800">
                  {formatRate(analysisTrend.totals.returnRate)}%
                </p>
              </article>
            </div>

            <div className="mt-4 overflow-x-auto">
              <div className="min-w-[860px] rounded-lg border border-slate-200 p-3">
                <div className="grid grid-cols-12 gap-2">
                  {analysisTrend.buckets.map((bucket) => {
                    const outboundHeight = Math.max(
                      4,
                      Math.round((bucket.outboundQty / maxBucketValue) * 120),
                    );
                    const returnHeight = Math.max(
                      4,
                      Math.round((bucket.returnQty / maxBucketValue) * 120),
                    );
                    return (
                      <div key={bucket.label} className="col-span-1 min-w-0 text-center">
                        <div className="flex h-36 items-end justify-center gap-1 rounded-md bg-slate-50 px-1 py-2">
                          <div
                            className="w-2 rounded-sm bg-blue-500"
                            style={{ height: `${outboundHeight}px` }}
                            title={`출고 ${formatDecimalForDisplay(bucket.outboundQty)}`}
                          />
                          <div
                            className="w-2 rounded-sm bg-emerald-500"
                            style={{ height: `${returnHeight}px` }}
                            title={`리턴 ${formatDecimalForDisplay(bucket.returnQty)}`}
                          />
                        </div>
                        <p className="mt-1 truncate text-[10px] text-slate-500">{bucket.label}</p>
                        <p className="text-[10px] text-slate-700">
                          {formatRate(bucket.returnRate)}%
                        </p>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-sm bg-blue-500" />
                    출고
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500" />
                    리턴
                  </span>
                  <span>기준 시각: {new Date(analysisTrend.asOf).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </>
        )}
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
