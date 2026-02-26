import type { DashboardMenu } from '@/features/dashboard/model/types';

type DashboardShellProps = {
  userName: string;
  companyName: string;
  onLogout: () => void;
  loggingOut: boolean;
  children: React.ReactNode;
};

const MENUS: DashboardMenu[] = [
  { label: '재고', description: '현재 재고/로트 현황' },
  { label: '입고', description: '업로드/확정 관리' },
  { label: '출고', description: '오더/피킹/배송 관리' },
  { label: '반품', description: '접수/결정/처리 관리' },
];

export function DashboardShell({
  userName,
  companyName,
  onLogout,
  loggingOut,
  children,
}: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 p-3 sm:p-4 md:grid-cols-[240px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:sticky md:top-4 md:h-fit">
          <h1 className="text-lg font-semibold">WarehouseHub</h1>
          <p className="mt-1 text-xs text-slate-500">{companyName}</p>
          <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 md:mt-6 md:block md:space-y-2 md:overflow-visible md:pb-0">
            {MENUS.map((menu) => (
              <button
                key={menu.label}
                className="min-w-[8rem] rounded-lg border border-slate-200 px-3 py-2 text-left transition hover:bg-slate-50 md:w-full md:min-w-0"
                type="button"
              >
                <p className="text-sm font-medium">{menu.label}</p>
                <p className="text-xs text-slate-500">{menu.description}</p>
              </button>
            ))}
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
