'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { resetPassword } from '@/features/auth/api/auth.api';
import { getErrorMessage } from '@/shared/utils/get-error-message';
import { LOGIN_PATH } from '@/features/auth/model/constants';
import { useToast } from '@/shared/ui/toast/toast-provider';
import {
  validatePassword,
  PASSWORD_REQUIREMENT_TEXT,
} from '@/shared/utils/validate-password';

function ResetPasswordFormInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { showToast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const hasToken = Boolean(token.trim());

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasToken) {
      showToast('유효하지 않은 링크입니다. 비밀번호 찾기를 다시 시도해주세요.', 'error');
      return;
    }
    const result = validatePassword(newPassword);
    if (!result.valid) {
      showToast(result.message, 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('비밀번호가 일치하지 않습니다.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword({ token: token.trim(), newPassword: newPassword.trim() });
      setSuccess(true);
      showToast('비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인해주세요.', 'success');
    } catch (err: unknown) {
      showToast(
        getErrorMessage(err, '비밀번호 변경에 실패했습니다.'),
        'error',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!hasToken) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-center text-xl font-semibold sm:text-2xl">
            비밀번호 재설정
          </h1>
          <p className="text-center text-sm text-slate-600">
            유효하지 않은 링크입니다. 비밀번호 찾기에서 다시 요청해주세요.
          </p>
          <Link
            href="/forgot-password"
            className="block h-11 w-full rounded-lg bg-slate-900 px-3 text-center text-sm font-medium leading-[2.75rem] text-white transition hover:bg-slate-800"
          >
            비밀번호 찾기
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 shadow-sm sm:p-8">
          <div className="flex justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
              ✓
            </span>
          </div>
          <h1 className="text-center text-xl font-semibold text-emerald-800 sm:text-2xl">
            비밀번호 재설정 완료
          </h1>
          <p className="text-center text-sm text-emerald-700">
            비밀번호가 성공적으로 변경되었습니다.
            <br />
            아래 버튼을 눌러 새 비밀번호로 로그인해주세요.
          </p>
          <Link
            href={LOGIN_PATH}
            className="block h-11 w-full rounded-lg bg-emerald-700 px-3 text-center text-sm font-medium leading-[2.75rem] text-white transition hover:bg-emerald-800"
          >
            로그인
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <h1 className="text-center text-xl font-semibold sm:text-2xl">
          비밀번호 재설정
        </h1>
        <p className="text-center text-sm text-slate-600">
          새 비밀번호를 입력해주세요.
        </p>

        <div className="space-y-1">
          <label htmlFor="reset-new-password" className="text-sm font-medium text-slate-700">
            새 비밀번호
          </label>
          <input
            id="reset-new-password"
            type="password"
            aria-label="새 비밀번호"
            aria-busy={submitting}
            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={submitting}
            autoComplete="new-password"
            placeholder={PASSWORD_REQUIREMENT_TEXT}
          />
          <p className="text-xs text-slate-500">{PASSWORD_REQUIREMENT_TEXT}</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="reset-confirm-password" className="text-sm font-medium text-slate-700">
            새 비밀번호 확인
          </label>
          <input
            id="reset-confirm-password"
            type="password"
            aria-label="새 비밀번호 확인"
            aria-busy={submitting}
            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={submitting}
            autoComplete="new-password"
            placeholder="비밀번호 다시 입력"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          aria-busy={submitting}
          aria-disabled={submitting}
          className="h-11 w-full rounded-lg bg-slate-900 px-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {submitting ? '변경 중...' : '비밀번호 변경'}
        </button>

        <p className="text-center text-sm text-slate-600">
          <Link href={LOGIN_PATH} className="font-medium text-slate-900 underline">
            로그인으로 돌아가기
          </Link>
        </p>
      </form>
    </div>
  );
}

export function ResetPasswordForm() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
          <div className="text-sm text-slate-500">로딩 중...</div>
        </div>
      }
    >
      <ResetPasswordFormInner />
    </Suspense>
  );
}
