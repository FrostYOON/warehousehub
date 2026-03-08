'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  listCompanyAuditLogs,
  exportCompanyAuditLogs,
  type ListCompanyAuditLogsParams,
} from '@/features/auth/api/auth.api';
import type { CompanyAuditLogItem } from '@/features/auth/model/types';
import { useToast } from '@/shared/ui/toast/toast-provider';
import { getErrorMessage } from '@/shared/utils/get-error-message';
import { ActionButton } from '@/shared/ui/common';

function formatAuditAction(action: string) {
  const m: Record<string, string> = {
    ROLE_CHANGED: '역할 변경',
    ACTIVATED: '활성화',
    DEACTIVATED: '비활성화',
  };
  return m[action] ?? action;
}

export default function AuditLogsPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<CompanyAuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [filters, setFilters] = useState<ListCompanyAuditLogsParams>({
    action: '',
    userId: '',
    actorUserId: '',
    from: '',
    to: '',
    page: 1,
    limit: 20,
  });

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: ListCompanyAuditLogsParams = {
        page: filters.page,
        limit: filters.limit,
      };
      if (filters.action?.trim()) params.action = filters.action.trim();
      if (filters.userId?.trim()) params.userId = filters.userId.trim();
      if (filters.actorUserId?.trim()) params.actorUserId = filters.actorUserId.trim();
      if (filters.from?.trim()) params.from = filters.from.trim();
      if (filters.to?.trim()) params.to = filters.to.trim();

      const res = await listCompanyAuditLogs(params);
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      showToast(getErrorMessage(err, '감사 로그 조회에 실패했습니다.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, showToast]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, page: 1 }));
  };

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const params: Omit<ListCompanyAuditLogsParams, 'page' | 'limit'> = {};
      if (filters.action?.trim()) params.action = filters.action.trim();
      if (filters.userId?.trim()) params.userId = filters.userId.trim();
      if (filters.actorUserId?.trim()) params.actorUserId = filters.actorUserId.trim();
      if (filters.from?.trim()) params.from = filters.from.trim();
      if (filters.to?.trim()) params.to = filters.to.trim();

      const blob = await exportCompanyAuditLogs(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('엑셀 다운로드를 시작했습니다.', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, '엑셀 다운로드에 실패했습니다.'), 'error');
    } finally {
      setExporting(false);
    }
  }, [filters, showToast]);

  const totalPages = Math.ceil(total / (filters.limit ?? 20));

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-slate-800">감사 로그</h1>
        <ActionButton
          onClick={() => void handleExport()}
          disabled={exporting}
          variant="secondary"
        >
          {exporting ? '다운로드 중...' : '엑셀 Export'}
        </ActionButton>
      </div>

      <form onSubmit={handleSearch} className="mb-6 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600">액션</label>
            <input
              type="text"
              value={filters.action ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
              placeholder="ROLE_CHANGED, ACTIVATED..."
              className="mt-0.5 h-8 w-36 rounded border border-slate-300 px-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">대상 ID</label>
            <input
              type="text"
              value={filters.userId ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value }))}
              placeholder="사용자 ID"
              className="mt-0.5 h-8 w-36 rounded border border-slate-300 px-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">실행자 ID</label>
            <input
              type="text"
              value={filters.actorUserId ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, actorUserId: e.target.value }))}
              placeholder="실행자 ID"
              className="mt-0.5 h-8 w-36 rounded border border-slate-300 px-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">시작일</label>
            <input
              type="date"
              value={filters.from ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              className="mt-0.5 h-8 w-36 rounded border border-slate-300 px-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">종료일</label>
            <input
              type="date"
              value={filters.to ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              className="mt-0.5 h-8 w-36 rounded border border-slate-300 px-2 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50"
            >
              검색
            </button>
          </div>
        </div>
      </form>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-2 text-left font-medium text-slate-600">일시</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">액션</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">대상</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">실행자</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">변경 내용</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      조건에 맞는 감사 로그가 없습니다.
                    </td>
                  </tr>
                ) : (
                  items.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
                    >
                      <td className="whitespace-nowrap px-4 py-2 text-slate-600">
                        {new Date(log.createdAt).toLocaleString('ko-KR')}
                      </td>
                      <td className="px-4 py-2 font-medium text-slate-800">
                        {formatAuditAction(log.action)}
                      </td>
                      <td className="px-4 py-2 text-slate-700">
                        {log.user.name}
                        <span className="ml-1 text-xs text-slate-500">({log.user.email})</span>
                      </td>
                      <td className="px-4 py-2 text-slate-700">
                        {log.actorUser.name}
                        <span className="ml-1 text-xs text-slate-500">({log.actorUser.email})</span>
                      </td>
                      <td className="max-w-xs px-4 py-2 text-slate-600">
                        {log.beforeValue && (
                          <span className="text-amber-700">이전: {log.beforeValue} → </span>
                        )}
                        {log.afterValue && (
                          <span className="text-emerald-700">이후: {log.afterValue}</span>
                        )}
                        {!log.beforeValue && !log.afterValue && <span className="text-slate-400">-</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-2 text-sm">
              <span className="text-slate-600">
                전체 {total}건 · {filters.page ?? 1} / {totalPages} 페이지
              </span>
              <div className="flex gap-1">
                <ActionButton
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                  disabled={(filters.page ?? 1) <= 1}
                  className="h-8 rounded border border-slate-300 px-2 text-xs disabled:opacity-50"
                >
                  이전
                </ActionButton>
                <ActionButton
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                  disabled={(filters.page ?? 1) >= totalPages}
                  className="h-8 rounded border border-slate-300 px-2 text-xs disabled:opacity-50"
                >
                  다음
                </ActionButton>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
