'use client';

import Link from 'next/link';
import { LOGIN_PATH } from '@/features/auth/model/constants';
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
        <h1 className="text-center text-xl font-semibold sm:text-2xl">회원가입 신청</h1>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Company</label>
          <select
            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
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
          <label className="text-sm font-medium text-slate-700">Name</label>
          <input
            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            autoComplete="name"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Email</label>
          <input
            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            autoComplete="email"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            type="password"
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
          <label className="text-sm font-medium text-slate-700">Role</label>
          <select
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
      </form>
    </div>
  );
}
