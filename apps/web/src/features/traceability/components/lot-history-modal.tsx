'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  exportLotHistory,
  getLotHistory,
  type LotHistoryResponse,
  type LotHistoryInventoryEntry,
} from '../api/traceability.api';
import { useToast } from '@/shared/ui/toast/toast-provider';
import { getErrorMessage } from '@/shared/utils/get-error-message';
import { ActionButton } from '@/shared/ui/common';

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

type LotHistoryModalProps = {
  lotId: string;
  lotLabel: string;
  onClose: () => void;
};

export function LotHistoryModal({ lotId, lotLabel, onClose }: LotHistoryModalProps) {
  const { showToast } = useToast();
  const [data, setData] = useState<LotHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getLotHistory(lotId)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.response?.data?.message ?? '이력 조회 실패');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lotId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800">Lot 이력 · {lotLabel}</h2>
          <div className="flex items-center gap-2">
            <Link
              href={`/traceability/lot/${lotId}`}
              className="inline-flex items-center rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              상세 페이지
            </Link>
            <ActionButton
              onClick={() => void handleExportExcel()}
              variant="secondary"
              size="sm"
            >
              엑셀 다운로드
            </ActionButton>
            <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="닫기"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          </div>
        </div>

        <div className="max-h-[calc(85vh-80px)] overflow-y-auto px-6 py-4">
          {loading && (
            <p className="py-8 text-center text-sm text-slate-500">이력을 불러오는 중...</p>
          )}
          {error && (
            <p className="py-8 text-center text-sm text-red-600">{error}</p>
          )}
          {data && !loading && (
            <div className="space-y-6">
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3">
                <p className="text-xs font-medium text-slate-500">Lot 정보</p>
                <p className="mt-1 text-sm">
                  {data.lot.itemCode} · {data.lot.itemName}
                  {data.lot.expiryDate && (
                    <span className="ml-2 text-slate-600">
                      유통기한 {data.lot.expiryDate}
                    </span>
                  )}
                </p>
              </div>

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
      </div>
    </div>
  );
}

function InventoryHistoryRow({ entry }: { entry: LotHistoryInventoryEntry }) {
  const label = TX_TYPE_LABELS[entry.type] ?? entry.type;
  const sign = entry.qtyDelta >= 0 ? '+' : '';
  const isInbound = entry.qtyDelta > 0;
  return (
    <div className="flex items-start justify-between gap-2 rounded border border-slate-200 px-3 py-2 text-sm">
      <div>
        <span
          className={
            isInbound
              ? 'font-medium text-emerald-700'
              : 'font-medium text-amber-700'
          }
        >
          {label}
        </span>
        <span className="ml-2 text-slate-600">
          {sign}{entry.qtyDelta} · {entry.warehouse.name} ({entry.warehouse.type})
        </span>
      </div>
      <div className="text-right text-xs text-slate-500">
        {new Date(entry.createdAt).toLocaleString('ko-KR')}
      </div>
    </div>
  );
}

function PickHistoryRow({
  entry,
}: {
  entry: {
    orderNo: number;
    customerName: string;
    qty: number;
    pickedQty: number;
    isCommitted: boolean;
    createdAt: string;
  };
}) {
  return (
    <div className="flex items-start justify-between gap-2 rounded border border-slate-200 px-3 py-2 text-sm">
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

function TransferHistoryRow({
  entry,
}: {
  entry: {
    transferId: string;
    fromWarehouse: { name: string; type: string };
    toWarehouse: { name: string; type: string };
    qty: number;
    status: string;
    createdAt: string;
  };
}) {
  return (
    <div className="flex items-start justify-between gap-2 rounded border border-slate-200 px-3 py-2 text-sm">
      <div>
        <span className="font-medium text-slate-700">창고 이동</span>
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
