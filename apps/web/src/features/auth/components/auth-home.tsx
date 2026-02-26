'use client';

import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import { DashboardShell, SummaryGrid } from '@/features/dashboard';
import type { DashboardSummary } from '@/features/dashboard/model/types';

export function AuthHome() {
  const { me, error, loggingOut, signOut } = useAuthSession();

  const summaryItems: DashboardSummary[] = [
    { title: '재고 품목', value: '-', hint: '연동 후 실시간 집계' },
    { title: '입고 대기', value: '-', hint: '확정 전 업로드 건수' },
    { title: '출고 진행', value: '-', hint: '피킹/배송 진행 건수' },
    { title: '반품 처리', value: '-', hint: '금일 반품 처리 건수' },
  ];

  return (
    <DashboardShell
      userName={me?.name ?? '사용자'}
      companyName={me?.companyName ?? '회사'}
      onLogout={signOut}
      loggingOut={loggingOut}
    >
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <SummaryGrid items={summaryItems} />
      {me && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">내 계정 정보</h2>
          <pre className="mt-2 overflow-auto rounded bg-slate-50 p-3 text-xs text-slate-700">
            {JSON.stringify(me, null, 2)}
          </pre>
        </section>
      )}
    </DashboardShell>
  );
}
