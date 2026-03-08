'use client';

import { useCallback, useEffect, useState } from 'react';
import { getTransfers } from '@/features/transfers/api/transfers.api';
import type { Transfer, TransferStatus } from '@/features/transfers/model/types';
import { StatusBadge } from '@/shared/ui/common';

export default function TransfersPage() {
  const [items, setItems] = useState<Transfer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState<TransferStatus | ''>('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTransfers({
        page,
        pageSize: 20,
        ...(statusFilter && { status: statusFilter }),
      });
      setItems(res.items);
      setTotal(res.total);
      setPage(res.page);
      setTotalPages(res.totalPages);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-slate-800">창고 간 이동</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">상태</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter((e.target.value || '') as TransferStatus | '');
              setPage(1);
            }}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
          >
            <option value="">전체</option>
            <option value="PENDING">대기</option>
            <option value="CONFIRMED">확정</option>
            <option value="CANCELLED">취소</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"
            aria-hidden
          />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
          창고 간 이동 내역이 없습니다.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                  출발 창고
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                  도착 창고
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                  품목 수
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                  상태
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                  등록일
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((t) => (
                <tr key={t.id} className="bg-white hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-800">
                    {t.fromWarehouse.name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-800">
                    {t.toWarehouse.name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                    {t.lines.reduce((sum, l) => sum + l.qty, 0)} (품목{' '}
                    {t.lines.length}건)
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                    {new Date(t.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            총 {total}건 중 {(page - 1) * 20 + 1}–
            {Math.min(page * 20, total)}건
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded border border-slate-300 px-3 py-1 disabled:opacity-50"
            >
              이전
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded border border-slate-300 px-3 py-1 disabled:opacity-50"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
