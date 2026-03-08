'use client';

import Link from 'next/link';
import { useLoginForm } from '@/features/auth/hooks/use-login-form';
import {
  FORGOT_PASSWORD_PATH,
  REGISTER_PATH,
  SIGNUP_PATH,
} from '@/features/auth/model/constants';

export function LoginForm() {
  const {
    companies,
    companiesLoading,
    companyName,
    email,
    password,
    submitting,
    setCompanyName,
    setEmail,
    setPassword,
    submit,
  } = useLoginForm();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submit();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 sm:px-6">
      <form
        onSubmit={onSubmit}
        className="modal-form-card max-w-md space-y-4"
      >
        <h1 className="page-title text-center text-xl sm:text-2xl">Login</h1>

        <div className="space-y-1">
          <label htmlFor="login-company" className="form-label">Company</label>
          <select
            id="login-company"
            aria-label="로그인할 회사 선택"
            aria-busy={companiesLoading}
            className="form-select-lg"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            disabled={submitting || companiesLoading || companies.length === 0}
          >
            {companiesLoading ? (
              <option value="">Loading companies...</option>
            ) : companies.length === 0 ? (
              <option value="">No companies available</option>
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
          <label htmlFor="login-email" className="form-label">Email</label>
          <input
            id="login-email"
            aria-label="이메일"
            aria-busy={submitting}
            className="form-input-lg"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            autoComplete="email"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="login-password" className="form-label">Password</label>
          <input
            id="login-password"
            type="password"
            aria-label="비밀번호"
            aria-busy={submitting}
            className="form-input-lg"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            autoComplete="current-password"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <Link
            href={FORGOT_PASSWORD_PATH}
            className="text-sm font-medium text-slate-700 underline decoration-slate-400 underline-offset-2 transition hover:text-slate-900 hover:decoration-slate-600"
          >
            비밀번호를 잊으셨나요?
          </Link>
        </div>

        <button
          type="submit"
          disabled={submitting || companiesLoading || companies.length === 0}
          aria-busy={submitting}
          aria-disabled={submitting || companiesLoading || companies.length === 0}
          className="btn-primary h-11 w-full"
        >
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>

        <p className="text-center text-sm text-slate-600">
          계정이 없나요?{' '}
          <Link
            href={SIGNUP_PATH}
            className="font-medium text-slate-900 underline"
          >
            기존 회사 가입 신청
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
