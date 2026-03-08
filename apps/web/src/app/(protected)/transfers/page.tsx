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
    <section className="page-section">
      <h2 className="page-title">창고 간 이동</h2>
      <p className="page-description">창고 간 재고 이동 내역을 조회합니다.</p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <label htmlFor="transfers-status" className="form-label !mb-0">상태</label>
          <select
            id="transfers-status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter((e.target.value || '') as TransferStatus | '');
              setPage(1);
            }}
            className="form-select h-9 w-auto min-w-[100px]"
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
        <div className="empty-state mt-4">
          <p className="empty-state-text">창고 간 이동 내역이 없습니다.</p>
        </div>
      ) : (
        <div className="table-wrapper mt-4">
          <table className="data-table min-w-[600px]">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  출발 창고
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  도착 창고
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  품목 수
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  상태
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  등록일
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id}>
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
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <span>
            총 {total}건 중 {(page - 1) * 20 + 1}–
            {Math.min(page * 20, total)}건
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="btn-secondary !h-8 px-3 py-1 text-sm"
            >
              이전
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="btn-secondary !h-8 px-3 py-1 text-sm"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
