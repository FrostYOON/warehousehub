'use client';

import Link from 'next/link';
import { LOGIN_PATH, SIGNUP_PATH } from '@/features/auth/model/constants';
import { useRegisterForm } from '@/features/auth/hooks/use-register-form';
import { PASSWORD_REQUIREMENT_TEXT } from '@/shared/utils/validate-password';

export function RegisterForm() {
  const {
    companyName,
    name,
    email,
    password,
    submitting,
    setCompanyName,
    setName,
    setEmail,
    setPassword,
    submit,
  } = useRegisterForm();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submit();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <h1 className="text-center text-xl font-semibold sm:text-2xl">
          회사 신규 등록
        </h1>
        <p className="text-center text-sm text-slate-600">
          최초 관리자로 회사와 계정을 함께 등록합니다.
        </p>

        <div className="space-y-1">
          <label htmlFor="register-company" className="text-sm font-medium text-slate-700">
            회사명
          </label>
          <input
            id="register-company"
            aria-label="회사명"
            aria-busy={submitting}
            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            disabled={submitting}
            placeholder="예: (주)창고허브"
            autoComplete="organization"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="register-name" className="text-sm font-medium text-slate-700">
            이름
          </label>
          <input
            id="register-name"
            aria-label="이름"
            aria-busy={submitting}
            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            autoComplete="name"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="register-email" className="text-sm font-medium text-slate-700">
            이메일
          </label>
          <input
            id="register-email"
            type="email"
            aria-label="이메일"
            aria-busy={submitting}
            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            autoComplete="email"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="register-password" className="text-sm font-medium text-slate-700">
            비밀번호
          </label>
          <input
            id="register-password"
            type="password"
            aria-label="비밀번호"
            aria-busy={submitting}
            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            autoComplete="new-password"
            placeholder={PASSWORD_REQUIREMENT_TEXT}
          />
          <p className="text-xs text-slate-500">{PASSWORD_REQUIREMENT_TEXT}</p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          aria-busy={submitting}
          aria-disabled={submitting}
          className="h-11 w-full rounded-lg bg-slate-900 px-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {submitting ? '등록 중...' : '회사 등록'}
        </button>

        <p className="text-center text-sm text-slate-600">
          이미 회사가 있나요?{' '}
          <Link
            href={SIGNUP_PATH}
            className="font-medium text-slate-900 underline"
          >
            기존 회사 가입 신청
          </Link>
        </p>

        <p className="text-center text-sm text-slate-600">
          이미 계정이 있나요?{' '}
          <Link href={LOGIN_PATH} className="font-medium text-slate-900 underline">
            로그인
          </Link>
        </p>
      </form>
    </div>
  );
}
