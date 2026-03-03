'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { DashboardMenu } from '@/features/dashboard/model/types';

type DashboardShellProps = {
  userName: string;
  companyName: string;
  onLogout: () => void;
  loggingOut: boolean;
  menus?: DashboardMenu[];
  children: React.ReactNode;
};

const MENUS: DashboardMenu[] = [
  { label: '대시보드', description: '요약 현황', href: '/' },
  { label: '재고', description: '현재 재고/로트 현황', href: '/stocks' },
  { label: '입고', description: '업로드/확정 관리', href: '/inbound' },
  { label: '출고', description: '오더/피킹/배송 관리', href: '/outbound' },
  { label: '반품', description: '접수/결정/처리 관리', href: '/returns' },
];

export function DashboardShell({
  userName,
  companyName,
  onLogout,
  loggingOut,
  menus = MENUS,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 p-3 sm:p-4 md:grid-cols-[240px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:sticky md:top-4 md:h-fit">
          <h1 className="text-lg font-semibold">WarehouseHub</h1>
          <p className="mt-1 text-xs text-slate-500">{companyName}</p>
          <nav className="mt-4 space-y-2 md:mt-6">
            {menus.map((menu) => {
              const isActive = pathname === menu.href;
              const baseClass =
                'block rounded-lg border px-3 py-2 text-left transition';
              const activeClass = isActive
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50';

              if (menu.disabled) {
                return (
                  <div
                    key={menu.label}
                    aria-disabled
                    className={`${baseClass} border-slate-200 bg-slate-100 text-slate-500 opacity-80`}
                    title={menu.disabledReason}
                  >
                    <p className="text-sm font-medium">{menu.label}</p>
                    <p className="text-xs text-slate-500">{menu.description}</p>
                    {menu.disabledReason && (
                      <p className="mt-1 text-[11px] text-amber-700">
                        {menu.disabledReason}
                      </p>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={menu.label}
                  href={menu.href}
                  className={`${baseClass} ${activeClass}`}
                >
                  <p className="text-sm font-medium">{menu.label}</p>
                  <p
                    className={`text-xs ${
                      isActive ? 'text-slate-200' : 'text-slate-500'
                    }`}
                  >
                    {menu.description}
                  </p>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="space-y-4">
          <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-500">안녕하세요</p>
              <p className="font-semibold">{userName}</p>
            </div>
            <button
              onClick={onLogout}
              disabled={loggingOut}
              className="h-10 rounded-lg border border-slate-300 px-4 text-sm hover:bg-slate-100 disabled:opacity-50"
              type="button"
            >
              {loggingOut ? '로그아웃 중...' : '로그아웃'}
            </button>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
