'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  exportLotHistory,
  getLotHistory,
  type LotHistoryResponse,
  type LotHistoryInventoryEntry,
  type LotHistoryPickEntry,
  type LotHistoryTransferEntry,
} from '@/features/traceability/api/traceability.api';
import { useToast } from '@/shared/ui/toast/toast-provider';
import { getErrorMessage } from '@/shared/utils/get-error-message';
import { formatDecimalForDisplay } from '@/shared/utils/format-decimal';
import { ActionButton } from '@/shared/ui/common';
import { canViewStock } from '@/features/auth/model/role-policy';
import { useAuthSession } from '@/features/auth';

const TX_TYPE_LABELS: Record<string, string> = {
  INBOUND_CONFIRM: '입고 확정',
  OUTBOUND_CONFIRM: '출고 확정',
  PICK_RESERVE: '픽 예약',
  PICK_RELEASE: '픽 취소',
  ADJUSTMENT: '수량 조정',
  RETURN_RESTOCK: '반품 재입고',
  RETURN_DISCARD: '반품 폐기',
  TRANSFER: '창고 이동',
};

export default function LotDetailPage() {
  const params = useParams<{ lotId: string }>();
  const router = useRouter();
  const lotId = params?.lotId ?? '';
  const { me } = useAuthSession();
  const { showToast } = useToast();
  const [data, setData] = useState<LotHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    if (!canViewStock(me.role)) {
      router.replace('/stocks');
      return;
    }
    if (!lotId) {
      router.replace('/stocks');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    getLotHistory(lotId)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.response?.data?.message ?? 'Lot 이력 조회 실패');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lotId, me, router]);

  const handleExportExcel = useCallback(async () => {
    try {
      const blob = await exportLotHistory(lotId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lot-history-${lotId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('Lot 이력 엑셀 다운로드를 시작했습니다.', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, '엑셀 다운로드에 실패했습니다.'), 'error');
    }
  }, [lotId, showToast]);

  if (!lotId) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/stocks"
            className="mb-2 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-800"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            재고 조회로 돌아가기
          </Link>
          <h1 className="text-xl font-semibold text-slate-800">Lot 상세 · 추적성</h1>
        </div>
        <ActionButton onClick={() => void handleExportExcel()} variant="secondary">
          엑셀 다운로드
        </ActionButton>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center text-red-700">
          {error}
        </div>
      )}
      {data && !loading && (
        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-medium text-slate-500">Lot 정보</h2>
            <p className="mt-1 text-base font-medium text-slate-800">
              {data.lot.itemCode} · {data.lot.itemName}
            </p>
            {data.lot.expiryDate && (
              <p className="mt-1 text-sm text-slate-600">유통기한 {data.lot.expiryDate}</p>
            )}
            <p className="mt-0.5 text-xs text-slate-500">
              Lot ID: {data.lot.id} · 생성일 {new Date(data.lot.createdAt).toLocaleDateString('ko-KR')}
            </p>
          </div>

          {data.stockSummary && data.stockSummary.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-semibold text-slate-700">재고 현황</h3>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-2 text-left font-medium text-slate-600">창고</th>
                      <th className="px-4 py-2 text-right font-medium text-slate-600">보유</th>
                      <th className="px-4 py-2 text-right font-medium text-slate-600">예약</th>
                      <th className="px-4 py-2 text-right font-medium text-slate-600">가용</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.stockSummary.map((row) => (
                      <tr key={row.warehouseId} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-2 text-slate-800">
                          {row.warehouse.name}
                          <span className="ml-1 text-slate-500">({row.warehouse.type})</span>
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-slate-700">
                          {formatDecimalForDisplay(row.onHand)}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-600">
                          {formatDecimalForDisplay(row.reserved)}
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-emerald-700">
                          {formatDecimalForDisplay(row.available)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">재고 변동 이력</h3>
            {data.inventoryHistory.length === 0 ? (
              <p className="rounded border border-dashed border-slate-200 py-4 text-center text-xs text-slate-500">
                변동 이력이 없습니다.
              </p>
            ) : (
              <div className="space-y-2">
                {data.inventoryHistory.map((entry) => (
                  <InventoryHistoryRow key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">픽 예약 이력</h3>
            {data.pickHistory.length === 0 ? (
              <p className="rounded border border-dashed border-slate-200 py-4 text-center text-xs text-slate-500">
                픽 이력이 없습니다.
              </p>
            ) : (
              <div className="space-y-2">
                {data.pickHistory.map((entry) => (
                  <PickHistoryRow key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">창고 이동 이력</h3>
            {data.transferHistory.length === 0 ? (
              <p className="rounded border border-dashed border-slate-200 py-4 text-center text-xs text-slate-500">
                이동 이력이 없습니다.
              </p>
            ) : (
              <div className="space-y-2">
                {data.transferHistory.map((entry) => (
                  <TransferHistoryRow key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function InventoryHistoryRow({ entry }: { entry: LotHistoryInventoryEntry }) {
  const label = TX_TYPE_LABELS[entry.type] ?? entry.type;
  const sign = entry.qtyDelta >= 0 ? '+' : '';
  const isInbound = entry.qtyDelta > 0;
  return (
    <div className="flex items-start justify-between gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-sm">
      <div>
        <span
          className={
            isInbound ? 'font-medium text-emerald-700' : 'font-medium text-amber-700'
          }
        >
          {label}
        </span>
        <span className="ml-2 text-slate-600">
          {sign}
          {entry.qtyDelta} · {entry.warehouse.name} ({entry.warehouse.type})
        </span>
      </div>
      <div className="text-right text-xs text-slate-500">
        {new Date(entry.createdAt).toLocaleString('ko-KR')}
      </div>
    </div>
  );
}

function PickHistoryRow({ entry }: { entry: LotHistoryPickEntry }) {
  return (
    <div className="flex items-start justify-between gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-sm">
      <div>
        <Link
          href={`/outbound?orderNo=${entry.orderNo}`}
          className="font-medium text-blue-600 hover:underline"
        >
          출고 #{entry.orderNo}
        </Link>
        <span className="ml-2 text-slate-600">
          {entry.customerName} · 예약 {entry.qty} / 픽 {entry.pickedQty}
          {entry.isCommitted && (
            <span className="ml-1 rounded bg-slate-100 px-1 text-xs">확정</span>
          )}
        </span>
      </div>
      <div className="text-right text-xs text-slate-500">
        {new Date(entry.createdAt).toLocaleString('ko-KR')}
      </div>
    </div>
  );
}

function TransferHistoryRow({ entry }: { entry: LotHistoryTransferEntry }) {
  return (
    <div className="flex items-start justify-between gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-sm">
      <div>
        <Link
          href={`/transfers?id=${entry.transferId}`}
          className="font-medium text-blue-600 hover:underline"
        >
          창고 이동
        </Link>
        <span className="ml-2 text-slate-600">
          {entry.fromWarehouse.name} → {entry.toWarehouse.name} · {entry.qty}개
          <span className="ml-1 text-slate-500">({entry.status})</span>
        </span>
      </div>
      <div className="text-right text-xs text-slate-500">
        {new Date(entry.createdAt).toLocaleString('ko-KR')}
      </div>
    </div>
  );
}
