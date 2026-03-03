'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuthSession } from '@/features/auth';
import { buildDashboardMenus, DashboardShell } from '@/features/dashboard';
import { useStocksPageWithOptions } from '@/features/stocks/hooks/use-stocks-page';
import type { ItemAnalyticsRange, StockRow, StorageType } from '@/features/stocks/model/types';
import { ActionButton } from '@/shared/ui/common';
import { useToast } from '@/shared/ui/toast/toast-provider';

function parseStorageType(value: string | null): '' | StorageType {
  if (value === 'DRY' || value === 'COOL' || value === 'FRZ') return value;
  return '';
}

function formatQty(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export default function StocksPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { me, loggingOut, signOut } = useAuthSession();
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
  const {
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
    resetFiltersAndReload,
  } = useStocksPageWithOptions({
    analysisItemId: initialItemId,
    analysisRange: initialRange,
    storageType: initialStorageType,
    itemCode: initialItemCode,
    page: initialPage,
    pageSize: initialPageSize,
  });
  const canEditStock = me?.role === 'ADMIN';
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [editingOnHand, setEditingOnHand] = useState('');
  const [editingReserved, setEditingReserved] = useState('');
  const [shortageOnly, setShortageOnly] = useState(initialShortageOnly);
  const [isMobile, setIsMobile] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

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
  }, [
    analysisItemId,
    analysisRange,
    itemCode,
    page,
    pageSize,
    pathname,
    router,
    searchParams,
    shortageOnly,
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
      memo: '재고 화면 관리자 수동 수정',
    });
    setEditingStockId(null);
  }

  return (
    <DashboardShell
      userName={me?.name ?? '사용자'}
      companyName={me?.companyName ?? '회사'}
      onLogout={signOut}
      loggingOut={loggingOut}
      menus={buildDashboardMenus(me?.role)}
    >
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">재고 조회</h2>
        <p className="mt-2 text-sm text-slate-600">
          창고 타입/품목코드로 필터링해 현재고, 예약수량, 가용수량을 확인합니다.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[200px_1fr_auto_auto]">
          <select
            value={storageType}
            onChange={(e) => setStorageType(e.target.value as '' | 'DRY' | 'COOL' | 'FRZ')}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
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
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
          <ActionButton
            onClick={() => void loadStocks({ nextPage: 1 })}
            disabled={loading}
            className="h-10 rounded-lg border border-slate-300 px-4 text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? '조회 중...' : '조회'}
          </ActionButton>
          <ActionButton
            onClick={() => {
              void resetFiltersAndReload();
            }}
            disabled={loading}
            className="h-10 rounded-lg border border-slate-300 px-4 text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            초기화
          </ActionButton>
        </div>
        <div className="mt-3 flex items-center justify-between">
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

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="px-2 py-2">창고</th>
                <th className="px-2 py-2">품목코드</th>
                <th className="px-2 py-2">품목명</th>
                <th className="px-2 py-2">유통기한</th>
                <th className="px-2 py-2">현재고</th>
                <th className="px-2 py-2">예약</th>
                <th className="px-2 py-2">가용</th>
                <th className="px-2 py-2">수정시각</th>
                {canEditStock && <th className="px-2 py-2">관리</th>}
              </tr>
            </thead>
            <tbody>
              {!loading &&
                displayedRows.map((row) => {
                  const available = row.onHand - row.reserved;
                  const isNegativeAvailable = available < 0;
                  return (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-2 py-2">
                        {row.warehouse.type} ({row.warehouse.name})
                      </td>
                      <td className="px-2 py-2">{row.lot.item.itemCode}</td>
                      <td className="px-2 py-2">{row.lot.item.itemName}</td>
                      <td className="px-2 py-2">
                        {row.lot.expiryDate
                          ? new Date(row.lot.expiryDate).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="px-2 py-2">
                        {editingStockId === row.id ? (
                          <input
                            value={editingOnHand}
                            onChange={(e) => setEditingOnHand(e.target.value)}
                            type="number"
                            step="0.1"
                            min="0"
                            className="h-8 w-24 rounded border border-slate-300 px-2 text-xs"
                          />
                        ) : (
                          formatQty(row.onHand)
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {editingStockId === row.id ? (
                          <input
                            value={editingReserved}
                            onChange={(e) => setEditingReserved(e.target.value)}
                            type="number"
                            step="0.1"
                            min="0"
                            className="h-8 w-24 rounded border border-slate-300 px-2 text-xs"
                          />
                        ) : (
                          formatQty(row.reserved)
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className={
                            isNegativeAvailable
                              ? 'rounded bg-red-50 px-1.5 py-0.5 font-medium text-red-700'
                              : ''
                          }
                        >
                          {formatQty(available)}
                        </span>
                        {isNegativeAvailable ? (
                          <span className="ml-1 rounded border border-red-200 bg-red-50 px-1 py-0.5 text-[10px] text-red-700">
                            부족
                          </span>
                        ) : null}
                      </td>
                      <td className="px-2 py-2">
                        {new Date(row.updatedAt).toLocaleString()}
                      </td>
                      {canEditStock && (
                        <td className="px-2 py-2">
                          {editingStockId === row.id ? (
                            <div className="flex gap-1">
                              <ActionButton
                                onClick={() => void saveEdit(row)}
                                disabled={updatingStockId === row.id}
                                className="h-8 rounded border border-slate-300 px-2 text-xs hover:bg-slate-100 disabled:opacity-50"
                              >
                                {updatingStockId === row.id ? '저장 중' : '저장'}
                              </ActionButton>
                              <ActionButton
                                onClick={() => setEditingStockId(null)}
                                disabled={updatingStockId === row.id}
                                className="h-8 rounded border border-slate-300 px-2 text-xs hover:bg-slate-100 disabled:opacity-50"
                              >
                                취소
                              </ActionButton>
                            </div>
                          ) : (
                            <ActionButton
                              onClick={() => beginEdit(row)}
                              className="h-8 rounded border border-slate-300 px-2 text-xs hover:bg-slate-100"
                            >
                              수정
                            </ActionButton>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {!loading && displayedRows.length === 0 && (
            <p className="mt-3 text-sm text-slate-600">조건에 맞는 재고가 없습니다.</p>
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
                  className="h-8 rounded border border-slate-300 px-2 text-sm"
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
        <div className="mt-3">
          <ActionButton
            onClick={() => void downloadStocksExcel()}
            className="h-9 rounded-lg border border-slate-300 px-3 text-sm hover:bg-slate-100"
          >
            재고 전체 엑셀 다운로드
          </ActionButton>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">아이템별 출고/리턴 분석</h2>
        <p className="mt-2 text-sm text-slate-600">
          아이템 단위로 기간별 출고량, 리턴량, 리턴율을 함께 확인합니다.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
          <select
            value={analysisItemId}
            onChange={(e) => setAnalysisItemId(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
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
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
          >
            <option value="WEEK">주간</option>
            <option value="QUARTER">분기</option>
            <option value="HALF">반기</option>
            <option value="YEAR">연간</option>
          </select>
          <ActionButton
            onClick={() => void loadAnalysisTrend()}
            disabled={analysisLoading || !analysisItemId}
            className="h-10 rounded-lg border border-slate-300 px-4 text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
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
                  {formatQty(analysisTrend.totals.outboundQty)}
                </p>
              </article>
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{rangeLabel[analysisTrend.range]} 리턴량</p>
                <p className="mt-1 text-xl font-semibold text-slate-800">
                  {formatQty(analysisTrend.totals.returnQty)}
                </p>
              </article>
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">리턴율</p>
                <p className="mt-1 text-xl font-semibold text-slate-800">
                  {analysisTrend.totals.returnRate.toFixed(2)}%
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
                            title={`출고 ${bucket.outboundQty}`}
                          />
                          <div
                            className="w-2 rounded-sm bg-emerald-500"
                            style={{ height: `${returnHeight}px` }}
                            title={`리턴 ${bucket.returnQty}`}
                          />
                        </div>
                        <p className="mt-1 truncate text-[10px] text-slate-500">{bucket.label}</p>
                        <p className="text-[10px] text-slate-700">
                          {bucket.returnRate.toFixed(1)}%
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
    </DashboardShell>
  );
}
