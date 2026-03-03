'use client';

import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import { canAccessInbound } from '@/features/auth/model/role-policy';
import { buildDashboardMenus, DashboardShell, SummaryGrid } from '@/features/dashboard';
import type { DashboardSummary } from '@/features/dashboard/model/types';

export function AuthHome() {
  const { me, loggingOut, signOut } = useAuthSession();

  const summaryItems: DashboardSummary[] = [
    { title: '재고 품목', value: '-', hint: '연동 후 실시간 집계' },
    { title: '출고 진행', value: '-', hint: '피킹/배송 진행 건수' },
    { title: '반품 처리', value: '-', hint: '금일 반품 처리 건수' },
  ];

  if (canAccessInbound(me?.role)) {
    summaryItems.splice(1, 0, {
      title: '입고 대기',
      value: '-',
      hint: '확정 전 업로드 건수',
    });
  }

  const menus = buildDashboardMenus(me?.role);

  return (
    <DashboardShell
      userName={me?.name ?? '사용자'}
      companyName={me?.companyName ?? '회사'}
      onLogout={signOut}
      loggingOut={loggingOut}
      menus={menus}
    >
      <SummaryGrid items={summaryItems} />
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">운영 바로가기</h2>
        <p className="mt-2 text-sm text-slate-600">
          디바이스 관리, 회원 승인, 내 계정 정보는 각각 전용 페이지로 이동해 관리할 수
          있습니다.
        </p>
      </section>
    </DashboardShell>
  );
}
