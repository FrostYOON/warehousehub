'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthSession } from '@/features/auth';
import { canAccessInventoryForecast } from '@/features/auth/model/role-policy';
import {
  getDemandForecast,
  getReorderSuggestions,
  type DemandForecastItem,
  type ReorderSuggestionItem,
} from '@/features/inventory-forecast/api/inventory-forecast.api';
import { useToast } from '@/shared/ui/toast/toast-provider';
import { formatDecimalForDisplay } from '@/shared/utils/format-decimal';

const URGENCY_LABELS: Record<ReorderSuggestionItem['urgency'], string> = {
  critical: '긴급',
  medium: '주의',
  low: '보통',
};

const URGENCY_STYLES: Record<ReorderSuggestionItem['urgency'], string> = {
  critical: 'bg-red-100 text-red-800',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-slate-100 text-slate-700',
};

export default function InventoryForecastPage() {
  const router = useRouter();
  const { me } = useAuthSession();
  const { showToast } = useToast();
  const access = canAccessInventoryForecast(me?.role);

  const [activeTab, setActiveTab] = useState<'demand' | 'reorder'>('demand');

  const [demandLookback, setDemandLookback] = useState(30);
  const [demandForecastDays, setDemandForecastDays] = useState(7);
  const [demandLoading, setDemandLoading] = useState(true);
  const [demandData, setDemandData] = useState<{
    items: DemandForecastItem[];
    total: number;
    page: number;
    totalPages: number;
    params: { lookbackDays: number; forecastDays: number };
  } | null>(null);
  const [demandPage, setDemandPage] = useState(1);

  const [reorderLookback, setReorderLookback] = useState(30);
  const [reorderLeadTime, setReorderLeadTime] = useState(7);
  const [reorderSafetyStock, setReorderSafetyStock] = useState(0);
  const [reorderLoading, setReorderLoading] = useState(true);
  const [reorderData, setReorderData] = useState<{
    items: ReorderSuggestionItem[];
    total: number;
    page: number;
    totalPages: number;
  } | null>(null);
  const [reorderPage, setReorderPage] = useState(1);

  useEffect(() => {
    if (me && !access) {
      router.replace('/stocks');
    }
  }, [access, me, router]);

  useEffect(() => {
    if (!access) return;
    let alive = true;
    setDemandLoading(true);
    getDemandForecast({
      lookbackDays: demandLookback,
      forecastDays: demandForecastDays,
      page: demandPage,
      pageSize: 20,
    })
      .then((data) => {
        if (alive)
          setDemandData({
            items: data.items,
            total: data.total,
            page: data.page,
            totalPages: data.totalPages,
            params: data.params,
          });
      })
      .catch(() => {
        if (alive) showToast('수요 예측 데이터를 불러오지 못했습니다.', 'error');
      })
      .finally(() => {
        if (alive) setDemandLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [access, demandLookback, demandForecastDays, demandPage, showToast]);

  useEffect(() => {
    if (!access) return;
    let alive = true;
    setReorderLoading(true);
    getReorderSuggestions({
      lookbackDays: reorderLookback,
      leadTimeDays: reorderLeadTime,
      safetyStock: reorderSafetyStock,
      page: reorderPage,
      pageSize: 20,
    })
      .then((data) => {
        if (alive)
          setReorderData({
            items: data.items,
            total: data.total,
            page: data.page,
            totalPages: data.totalPages,
          });
      })
      .catch(() => {
        if (alive) showToast('발주 제안 데이터를 불러오지 못했습니다.', 'error');
      })
      .finally(() => {
        if (alive) setReorderLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [
    access,
    reorderLookback,
    reorderLeadTime,
    reorderSafetyStock,
    reorderPage,
    showToast,
  ]);

  if (!access) return null;

  return (
    <section className="page-section">
      <h2 className="page-title">재고 예측 / 발주 제안</h2>
      <p className="page-description">
        출고 이력을 기반으로 품목별 수요를 예측하고, 발주가 필요한 품목을
        제안합니다.
      </p>

      <div className="mt-4 flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('demand')}
          className={`border-b-2 px-3 py-2 text-sm font-medium transition ${
            activeTab === 'demand'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          수요 예측
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reorder')}
          className={`border-b-2 px-3 py-2 text-sm font-medium transition ${
            activeTab === 'reorder'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          발주 제안
        </button>
      </div>

      {activeTab === 'demand' && (
        <div className="mt-4">
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-slate-600">분석 기간</span>
              <select
                value={demandLookback}
                onChange={(e) => {
                  setDemandLookback(Number(e.target.value));
                  setDemandPage(1);
                }}
                className="form-input h-9 w-24"
              >
                {[7, 14, 30, 60, 90].map((d) => (
                  <option key={d} value={d}>
                    {d}일
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-slate-600">예측 기간</span>
              <select
                value={demandForecastDays}
                onChange={(e) => {
                  setDemandForecastDays(Number(e.target.value));
                  setDemandPage(1);
                }}
                className="form-input h-9 w-24"
              >
                {[7, 14, 30].map((d) => (
                  <option key={d} value={d}>
                    {d}일
                  </option>
                ))}
              </select>
            </label>
          </div>
          {demandLoading ? (
            <p className="text-sm text-slate-600">로딩 중...</p>
          ) : demandData && demandData.items.length > 0 ? (
            <div className="space-y-3">
              <div className="table-wrapper">
                <table className="data-table min-w-[680px]">
                  <thead>
                    <tr>
                      <th>품목코드</th>
                      <th>품목명</th>
                      <th className="text-right">분석기간 출고</th>
                      <th className="text-right">일평균</th>
                      <th className="text-right">
                        {demandForecastDays}일 예측 수요
                      </th>
                      <th>출고 일수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demandData.items.map((item) => (
                      <tr key={item.itemId}>
                        <td className="font-mono text-slate-600">
                          {item.itemCode}
                        </td>
                        <td>{item.itemName}</td>
                        <td className="text-right tabular-nums">
                          {formatDecimalForDisplay(item.totalOutboundQty)}
                        </td>
                        <td className="text-right tabular-nums">
                          {formatDecimalForDisplay(item.avgDailyOutbound)}
                        </td>
                        <td className="text-right tabular-nums font-medium">
                          {formatDecimalForDisplay(item.forecastedDemand)}
                        </td>
                        <td className="tabular-nums">{item.activeDays}일</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  총 {demandData.total}건 · 최근 {demandData.params.lookbackDays}
                  일 출고 이력 기준
                </span>
                {demandData.totalPages > 1 && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setDemandPage((p) => Math.max(1, p - 1))
                      }
                      disabled={demandPage <= 1}
                      className="rounded border border-slate-300 px-2 py-1 disabled:opacity-50"
                    >
                      이전
                    </button>
                    <span>
                      {demandData.page} / {demandData.totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setDemandPage((p) =>
                          Math.min(demandData.totalPages, p + 1),
                        )
                      }
                      disabled={demandPage >= demandData.totalPages}
                      className="rounded border border-slate-300 px-2 py-1 disabled:opacity-50"
                    >
                      다음
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              분석 기간 내 배송 완료된 출고 이력이 없습니다. 출고가 완료되면
              수요 예측이 가능합니다.
            </p>
          )}
        </div>
      )}

      {activeTab === 'reorder' && (
        <div className="mt-4">
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-slate-600">출고 분석</span>
              <select
                value={reorderLookback}
                onChange={(e) => {
                  setReorderLookback(Number(e.target.value));
                  setReorderPage(1);
                }}
                className="form-input h-9 w-24"
              >
                {[7, 14, 30, 60, 90].map((d) => (
                  <option key={d} value={d}>
                    {d}일
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-slate-600">리드타임</span>
              <select
                value={reorderLeadTime}
                onChange={(e) => {
                  setReorderLeadTime(Number(e.target.value));
                  setReorderPage(1);
                }}
                className="form-input h-9 w-24"
              >
                {[1, 3, 5, 7, 10, 14].map((d) => (
                  <option key={d} value={d}>
                    {d}일
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-slate-600">안전재고</span>
              <input
                type="number"
                min={0}
                step={1}
                value={reorderSafetyStock}
                onChange={(e) => {
                  setReorderSafetyStock(
                    Math.max(0, Number(e.target.value) || 0),
                  );
                  setReorderPage(1);
                }}
                className="form-input h-9 w-20"
              />
            </label>
          </div>
          {reorderLoading ? (
            <p className="text-sm text-slate-600">로딩 중...</p>
          ) : reorderData && reorderData.items.length > 0 ? (
            <div className="space-y-3">
              <div className="table-wrapper">
                <table className="data-table min-w-[780px]">
                  <thead>
                    <tr>
                      <th>심각도</th>
                      <th>품목코드</th>
                      <th>품목명</th>
                      <th className="text-right">현재 재고</th>
                      <th className="text-right">일평균</th>
                      <th className="text-right">리드타임 수요</th>
                      <th className="text-right">발주점</th>
                      <th className="text-right">제안 수량</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reorderData.items.map((item) => (
                      <tr key={item.itemId}>
                        <td>
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-medium ${URGENCY_STYLES[item.urgency]}`}
                          >
                            {URGENCY_LABELS[item.urgency]}
                          </span>
                        </td>
                        <td className="font-mono text-slate-600">
                          {item.itemCode}
                        </td>
                        <td>{item.itemName}</td>
                        <td className="text-right tabular-nums">
                          {formatDecimalForDisplay(item.currentStock)}
                        </td>
                        <td className="text-right tabular-nums">
                          {formatDecimalForDisplay(item.avgDailyOutbound)}
                        </td>
                        <td className="text-right tabular-nums">
                          {formatDecimalForDisplay(item.leadTimeDemand)}
                        </td>
                        <td className="text-right tabular-nums">
                          {formatDecimalForDisplay(item.reorderPoint)}
                        </td>
                        <td className="text-right tabular-nums font-medium">
                          {item.suggestedQty}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>발주가 제안된 품목 {reorderData.total}건</span>
                {reorderData.totalPages > 1 && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setReorderPage((p) => Math.max(1, p - 1))
                      }
                      disabled={reorderPage <= 1}
                      className="rounded border border-slate-300 px-2 py-1 disabled:opacity-50"
                    >
                      이전
                    </button>
                    <span>
                      {reorderData.page} / {reorderData.totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setReorderPage((p) =>
                          Math.min(reorderData.totalPages, p + 1),
                        )
                      }
                      disabled={reorderPage >= reorderData.totalPages}
                      className="rounded border border-slate-300 px-2 py-1 disabled:opacity-50"
                    >
                      다음
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              발주가 제안된 품목이 없습니다. 재고가 충분하거나 출고 이력이
              부족할 수 있습니다.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
