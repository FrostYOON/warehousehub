'use client';

import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import { DashboardShell, SummaryGrid } from '@/features/dashboard';
import type { DashboardSummary } from '@/features/dashboard/model/types';

export function AuthHome() {
  const {
    me,
    devices,
    maxActiveDevices,
    error,
    loggingOut,
    loadingDevices,
    deviceActionId,
    loggingOutOthers,
    signOut,
    revokeDevice,
    signOutOthers,
  } = useAuthSession();

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
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">
              로그인된 디바이스
            </h2>
            <p className="text-xs text-slate-500">
              현재 {devices.length} / 최대 {maxActiveDevices} 대
            </p>
          </div>
          <button
            type="button"
            onClick={signOutOthers}
            disabled={loggingOutOthers || devices.length <= 1}
            className="h-9 rounded-lg border border-slate-300 px-3 text-xs hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loggingOutOthers ? '처리 중...' : '다른 디바이스 로그아웃'}
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {loadingDevices && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              디바이스 목록을 불러오는 중...
            </p>
          )}
          {!loadingDevices && devices.length === 0 && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              활성 디바이스 세션이 없습니다.
            </p>
          )}
          {!loadingDevices &&
            devices.map((device) => (
              <div
                key={device.id}
                className="rounded-lg border border-slate-200 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-800">
                    {device.deviceName ?? '알 수 없는 디바이스'}
                  </p>
                  <div className="flex items-center gap-2">
                    {device.isCurrent && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                        현재 디바이스
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={device.isCurrent || deviceActionId === device.id}
                      onClick={() => revokeDevice(device.id)}
                      className="h-8 rounded-md border border-slate-300 px-2 text-xs hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deviceActionId === device.id ? '처리 중...' : '로그아웃'}
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  IP: {device.ip ?? '-'} / 만료:{' '}
                  {new Date(device.expiresAt).toLocaleString()}
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">
                  UA: {device.userAgent ?? '-'}
                </p>
              </div>
            ))}
        </div>
      </section>
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
