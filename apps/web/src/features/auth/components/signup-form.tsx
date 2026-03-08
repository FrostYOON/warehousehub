'use client';

import Link from 'next/link';
import {
  LOGIN_PATH,
  REGISTER_PATH,
} from '@/features/auth/model/constants';
import { useSignupForm } from '@/features/auth/hooks/use-signup-form';
import { PASSWORD_REQUIREMENT_TEXT } from '@/shared/utils/validate-password';

export function SignupForm() {
  const {
    companies,
    companiesLoading,
    roleOptions,
    companyName,
    email,
    name,
    password,
    role,
    submitting,
    setCompanyName,
    setEmail,
    setName,
    setPassword,
    setRole,
    submit,
  } = useSignupForm();

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
          기존 회사 가입 신청
        </h1>
        <p className="text-center text-sm text-slate-600">
          이미 등록된 회사에 가입을 신청합니다. 관리자 승인 후 로그인할 수 있습니다.
        </p>

        <div className="space-y-1">
          <label htmlFor="signup-company" className="text-sm font-medium text-slate-700">
            회사
          </label>
          <select
            id="signup-company"
            aria-label="가입 신청할 회사 선택"
            aria-busy={companiesLoading}
            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            disabled={submitting || companiesLoading || companies.length === 0}
          >
            {companiesLoading ? (
              <option value="">회사 목록 로딩 중...</option>
            ) : companies.length === 0 ? (
              <option value="">등록된 회사가 없습니다</option>
            ) : (
              companies.map((company) => (
                <option key={company.id} value={company.name}>
                  {company.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="signup-name" className="text-sm font-medium text-slate-700">
            이름
          </label>
          <input
            id="signup-name"
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
          <label htmlFor="signup-email" className="text-sm font-medium text-slate-700">
            이메일
          </label>
          <input
            id="signup-email"
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
          <label htmlFor="signup-password" className="text-sm font-medium text-slate-700">
            비밀번호
          </label>
          <input
            id="signup-password"
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

        <div className="space-y-1">
          <label htmlFor="signup-role" className="text-sm font-medium text-slate-700">
            역할
          </label>
          <select
            id="signup-role"
            aria-label="희망 역할 선택"
            aria-busy={submitting}
            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
            disabled={submitting}
          >
            {roleOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={submitting || companiesLoading || companies.length === 0}
          aria-busy={submitting}
          aria-disabled={submitting || companiesLoading || companies.length === 0}
          className="h-11 w-full rounded-lg bg-slate-900 px-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {submitting ? '신청 중...' : '가입 신청'}
        </button>

        <p className="text-center text-sm text-slate-600">
          이미 계정이 있나요?{' '}
          <Link href={LOGIN_PATH} className="font-medium text-slate-900 underline">
            로그인
          </Link>
        </p>

        <p className="text-center text-xs text-slate-500">
          새 회사를 만드시나요?{' '}
          <Link
            href={REGISTER_PATH}
            className="text-slate-600 hover:text-slate-800"
          >
            회사 신규 등록
          </Link>
        </p>
      </form>
    </div>
  );
}
