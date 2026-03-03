'use client';

import Link from 'next/link';
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
  const quickMenus = menus.filter((menu) => menu.href !== '/');

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
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">운영 바로가기</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {me?.role ?? 'ROLE'}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-600">자주 쓰는 화면으로 빠르게 이동합니다.</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {quickMenus.map((menu) => (
            <Link
              key={menu.href}
              href={menu.href}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <p className="font-medium">{menu.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{menu.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}
