'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthSession } from '@/features/auth';

export default function ApprovalsPage() {
  const router = useRouter();
  const {
    me,
    pendingUsers,
    loadingPendingUsers,
    approveActionId,
    rejectActionId,
    approveUser,
    rejectUser,
  } = useAuthSession();

  useEffect(() => {
    if (me && me.role !== 'ADMIN') {
      router.replace('/');
    }
  }, [me, router]);

  return (
    <section className="page-section">
        <div className="mb-4">
          <h2 className="page-title">회원가입 승인</h2>
          <p className="page-description">
            같은 회사의 가입 신청 계정을 승인할 수 있습니다.
          </p>
        </div>
        {loadingPendingUsers && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            승인 대기 사용자를 불러오는 중...
          </p>
        )}
        {!loadingPendingUsers && pendingUsers.length === 0 && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            승인 대기 중인 사용자가 없습니다.
          </p>
        )}
        {!loadingPendingUsers && pendingUsers.length > 0 && (
          <div className="space-y-2">
            {pendingUsers.map((user) => (
              <div
                key={user.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{user.name}</p>
                  <p className="text-xs text-slate-500">
                    {user.email} / {user.role}
                  </p>
                  <p className="text-xs text-slate-500">
                    신청일 {new Date(user.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => approveUser(user.id)}
                    disabled={approveActionId === user.id}
                    className="h-9 rounded-lg border border-slate-300 px-3 text-xs hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {approveActionId === user.id ? '승인 중...' : '승인'}
                  </button>
                  <button
                    type="button"
                    onClick={() => rejectUser(user.id)}
                    disabled={rejectActionId === user.id}
                    className="h-9 rounded-lg border border-red-200 px-3 text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {rejectActionId === user.id ? '거절 중...' : '거절'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
    </section>
  );
}
