'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { getAsnList, cancelAsn } from '@/features/asn/api/asn.api';
import type { Asn, AsnStatus } from '@/features/asn/model/types';
import { StatusBadge } from '@/shared/ui/common';
import { useToast } from '@/shared/ui/toast/toast-provider';
import { getErrorMessage } from '@/shared/utils/get-error-message';

const STATUS_LABELS: Record<AsnStatus, string> = {
  PENDING: '대기',
  SHIPPED: '출고 완료',
  RECEIVED: '입고 완료',
  CANCELLED: '취소',
};

export default function AsnPage() {
  const [items, setItems] = useState<Asn[]>([]);
  const [statusFilter, setStatusFilter] = useState<AsnStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAsnList(
        statusFilter ? { status: statusFilter } : undefined,
      );
      setItems(res);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCancel = useCallback(
    async (id: string) => {
      setCancellingId(id);
      try {
        await cancelAsn(id);
        showToast('입고 예정이 취소되었습니다.', 'success');
        load();
      } catch (err) {
        showToast(
          getErrorMessage(err, '입고 예정 취소에 실패했습니다.'),
          'error',
        );
      } finally {
        setCancellingId(null);
      }
    },
    [load, showToast],
  );

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-slate-800">입고 예정</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/asn/new"
            className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
          >
            입고 예정 등록
          </Link>
          <span className="text-sm text-slate-500">상태</span>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter((e.target.value || '') as AsnStatus | '')
            }
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
          >
            <option value="">전체</option>
            <option value="PENDING">대기</option>
            <option value="SHIPPED">출고 완료</option>
            <option value="RECEIVED">입고 완료</option>
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
          입고 예정 내역이 없습니다.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                  출발
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                  도착
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                  예정일
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
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((a) => (
                <tr key={a.id} className="bg-white hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-800">
                    {a.fromBranch?.name ?? '-'} /{' '}
                    {a.fromWarehouse?.name ?? '-'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-800">
                    {a.toBranch.name} / {a.toWarehouse.name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                    {new Date(a.expectedDate).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                    {a.lines.length}건
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                    {new Date(a.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {a.status === 'PENDING' && (
                      <button
                        type="button"
                        onClick={() => handleCancel(a.id)}
                        disabled={cancellingId === a.id}
                        className="text-xs text-red-600 hover:underline disabled:opacity-50"
                      >
                        {cancellingId === a.id ? '취소 중...' : '취소'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
