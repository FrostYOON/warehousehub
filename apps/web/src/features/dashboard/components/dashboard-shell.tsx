'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const renderMenuItems = (isMobile = false) =>
    menus.map((menu) => {
      const isActive = pathname === menu.href;
      const baseClass = 'block rounded-lg border px-3 py-2 text-left transition';
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
              <p className="mt-1 text-[11px] text-amber-700">{menu.disabledReason}</p>
            )}
          </div>
        );
      }

      return (
        <Link
          key={menu.label}
          href={menu.href}
          className={`${baseClass} ${activeClass}`}
          onClick={() => {
            if (isMobile) setMobileMenuOpen(false);
          }}
        >
          <p className="text-sm font-medium">{menu.label}</p>
          <p className={`text-xs ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>
            {menu.description}
          </p>
        </Link>
      );
    });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 p-3 sm:p-4 md:grid-cols-[240px_1fr]">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm md:hidden">
          <div>
            <h1 className="text-sm font-semibold">WarehouseHub</h1>
            <p className="text-[11px] text-slate-500">{userName}님</p>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700"
            aria-label="메뉴 열기"
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden className="h-4 w-4 stroke-current">
              <path d="M3 5h14M3 10h14M3 15h14" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {mobileMenuOpen ? (
          <div className="fixed inset-0 z-50 bg-black/30 md:hidden">
            <aside className="flex h-full w-72 max-w-[85vw] flex-col bg-white p-4 shadow-xl">
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center justify-between gap-2">
                  <h1 className="text-lg font-semibold">WarehouseHub</h1>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300"
                    aria-label="메뉴 닫기"
                  >
                    <svg viewBox="0 0 20 20" fill="none" aria-hidden className="h-4 w-4 stroke-current">
                      <path d="M5 5l10 10M15 5L5 15" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                <div className="mt-1 grid grid-cols-[1fr_auto] items-center gap-2 text-xs text-slate-500">
                  <p className="truncate" title={companyName}>
                    {companyName}
                  </p>
                  <p className="shrink-0 whitespace-nowrap">{userName}님</p>
                </div>
              </div>
              <nav className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1">{renderMenuItems(true)}</nav>
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <button
                  onClick={onLogout}
                  disabled={loggingOut}
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm hover:bg-slate-100 disabled:opacity-50"
                  type="button"
                >
                  {loggingOut ? '로그아웃 중...' : '로그아웃'}
                </button>
              </div>
            </aside>
          </div>
        ) : null}

        <aside className="hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:sticky md:top-4 md:flex md:h-[calc(100vh-2rem)] md:flex-col">
          <div className="border-b border-slate-100 pb-3">
            <h1 className="text-lg font-semibold">WarehouseHub</h1>
            <div className="mt-1 grid grid-cols-[1fr_auto] items-center gap-2 text-xs text-slate-500">
              <p className="truncate" title={companyName}>
                {companyName}
              </p>
              <p className="shrink-0 whitespace-nowrap">{userName}님</p>
            </div>
          </div>
          <nav className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1 md:mt-5">{renderMenuItems()}</nav>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <button
              onClick={onLogout}
              disabled={loggingOut}
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm hover:bg-slate-100 disabled:opacity-50"
              type="button"
            >
              {loggingOut ? '로그아웃 중...' : '로그아웃'}
            </button>
          </div>
        </aside>

        <main className="space-y-4">{children}</main>
      </div>
    </div>
  );
}
