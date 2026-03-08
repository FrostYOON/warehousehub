'use client';

import { AuthSessionProvider, useAuthSessionContext } from '@/features/auth/context/auth-session-context';
import {
  canAccessInbound,
  canAccessMembers,
  canAccessTemperatureMonitor,
} from '@/features/auth/model/role-policy';
import { LOGIN_PATH } from '@/features/auth/model/constants';
import { buildDashboardMenus, DashboardShell } from '@/features/dashboard';
import { DashboardProviders } from '@/features/dashboard/components/dashboard-providers';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const ADMIN_ONLY_PATHS = ['/', '/approvals', '/members'];
const INBOUND_PATH = '/inbound';
const ITEMS_PATH = '/items';
const TEMPERATURE_MONITOR_PATH = '/temperature-monitor';
const STOCKTAKING_PATH = '/stocktaking';

function getDefaultRedirectPath(role?: string): string {
  if (role === 'ADMIN') return '/';
  return '/stocks';
}

function ProtectedContent({ children }: { children: React.ReactNode }) {
  const { me, loadingMe, loggingOut, signOut } = useAuthSessionContext();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loadingMe || !me) return;
    if (me === null) {
      router.replace(LOGIN_PATH);
      return;
    }

    const role = me.role;

    if (ADMIN_ONLY_PATHS.includes(pathname) && !canAccessMembers(role)) {
      router.replace(getDefaultRedirectPath(role));
      return;
    }

    if (pathname === INBOUND_PATH && !canAccessInbound(role)) {
      router.replace('/stocks');
      return;
    }

    if (pathname === ITEMS_PATH && !canAccessInbound(role)) {
      router.replace('/stocks');
      return;
    }

    if (pathname === TEMPERATURE_MONITOR_PATH && !canAccessTemperatureMonitor(role)) {
      router.replace('/stocks');
      return;
    }

    if (pathname === STOCKTAKING_PATH && !canAccessInbound(role)) {
      router.replace('/stocks');
      return;
    }
  }, [loadingMe, me, pathname, router]);

  if (loadingMe) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600"
            aria-hidden
          />
          <p className="text-sm text-slate-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!me) {
    return null;
  }

  const canRecordTemperature = canAccessTemperatureMonitor(me?.role);

  return (
    <DashboardProviders>
      <DashboardShell
        userName={me?.name ?? '사용자'}
        companyName={me?.companyName ?? '회사'}
        onLogout={signOut}
        loggingOut={loggingOut}
        menus={buildDashboardMenus(me?.role)}
        canRecordTemperature={canRecordTemperature}
      >
        {children}
      </DashboardShell>
    </DashboardProviders>
  );
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthSessionProvider>
      <ProtectedContent>{children}</ProtectedContent>
    </AuthSessionProvider>
  );
}
