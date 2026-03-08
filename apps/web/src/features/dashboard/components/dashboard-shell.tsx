'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DashboardMenu } from '@/features/dashboard/model/types';
import { HeaderWeatherWidget } from './header-weather-widget';
import { HeaderTemperatureBadge } from './header-temperature-badge';

type DashboardShellProps = {
  userName: string;
  companyName: string;
  onLogout: () => void;
  loggingOut: boolean;
  menus?: DashboardMenu[];
  canRecordTemperature?: boolean;
  children: React.ReactNode;
};

const MENUS: DashboardMenu[] = [
  { label: '대시보드', description: '요약 현황', href: '/' },
  { label: '재고', description: '재고·로트 현황', href: '/stocks' },
  { label: '입고', description: '업로드·확정', href: '/inbound' },
  { label: '출고', description: '오더·피킹·배송', href: '/outbound' },
  { label: '반품', description: '접수·결정·처리', href: '/returns' },
];

function Cog6ToothIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

function UserCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}

export function DashboardShell({
  userName,
  companyName,
  onLogout,
  loggingOut,
  menus = MENUS,
  canRecordTemperature = false,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  const closeUserDropdown = useCallback(() => setUserDropdownOpen(false), []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        closeUserDropdown();
      }
    };
    if (userDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userDropdownOpen, closeUserDropdown]);

  const renderMenuItems = (isMobile = false) =>
    menus.map((menu) => {
      const isActive = pathname === menu.href;
      const baseClass =
        'block rounded-lg px-2.5 py-2 text-left transition-colors duration-150';
      const activeClass = isActive
        ? 'bg-slate-900 text-white'
        : 'text-slate-700 hover:bg-slate-100';

      if (menu.disabled) {
        return (
          <div
            key={menu.label}
            aria-disabled
            className={`${baseClass} bg-slate-50 text-slate-400`}
            title={menu.disabledReason}
          >
            <p className="text-sm font-medium">{menu.label}</p>
            <p className="mt-0.5 text-xs text-slate-400">{menu.description}</p>
            {menu.disabledReason && (
              <p className="mt-1 text-[11px] text-amber-600">{menu.disabledReason}</p>
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
          <p className="text-sm font-medium leading-tight">{menu.label}</p>
          <p className={`mt-0.5 text-xs leading-snug ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
            {menu.description}
          </p>
        </Link>
      );
    });

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-900">
      {/* 상단 헤더 - Notion/Linear 스타일 */}
      <header className="z-10 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-1 md:hidden"
            aria-label="메뉴 열기"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden
              className="h-5 w-5"
            >
              <path d="M3 5h14M3 10h14M3 15h14" />
            </svg>
          </button>
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 text-slate-900 no-underline transition-opacity hover:opacity-90"
          >
            <span className="text-lg font-bold tracking-tight text-slate-900">
              WarehouseHub
            </span>
          </Link>
          <div className="hidden min-w-0 shrink border-l border-slate-200 pl-4 md:block">
            <p
              className="truncate text-sm font-medium text-slate-600"
              title={companyName}
            >
              {companyName}
            </p>
          </div>
          <div className="hidden shrink-0 items-center gap-3 border-l border-slate-200 pl-4 lg:flex">
            <HeaderWeatherWidget />
            <HeaderTemperatureBadge canRecord={canRecordTemperature} />
          </div>
        </div>

        {/* 우측 사용자 영역 */}
        <div className="relative flex shrink-0 items-center gap-2" ref={userDropdownRef}>
          <button
            type="button"
            onClick={() => setUserDropdownOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            aria-expanded={userDropdownOpen}
            aria-haspopup="true"
          >
            <UserCircleIcon className="h-5 w-5 text-slate-500" />
            <span className="max-w-[120px] truncate text-sm font-medium md:max-w-[160px]">
              {userName}
            </span>
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden
              className={`h-4 w-4 text-slate-400 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`}
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {userDropdownOpen && (
            <div
              className="absolute right-0 top-full z-50 mt-1.5 w-48 origin-top-right rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
              role="menu"
            >
              <Link
                href="/account"
                onClick={closeUserDropdown}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                role="menuitem"
              >
                <Cog6ToothIcon className="h-4 w-4 text-slate-500" />
                내 계정
              </Link>
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                onClick={() => {
                  closeUserDropdown();
                  onLogout();
                }}
                disabled={loggingOut}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                role="menuitem"
              >
                {loggingOut ? '로그아웃 중...' : '로그아웃'}
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        {/* 모바일 사이드바 오버레이 */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden
          />
        )}
        <aside
          className={`fixed left-0 top-14 z-30 flex h-[calc(100vh-3.5rem)] w-56 flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 md:relative md:top-0 md:h-auto md:shrink-0 md:translate-x-0 md:shadow-none ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 px-4 md:hidden">
            <span className="text-sm font-semibold text-slate-900">메뉴</span>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
              aria-label="메뉴 닫기"
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden
                className="h-5 w-5"
              >
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <nav className="space-y-0.5" aria-label="주 메뉴">
              {renderMenuItems(true)}
            </nav>
          </div>
        </aside>

        {/* 메인 콘텐츠 - 충분한 여백, 최대 너비 제한 */}
        <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1600px] space-y-6 lg:space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
