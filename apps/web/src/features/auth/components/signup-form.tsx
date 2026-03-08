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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 sm:px-6">
      <form
        onSubmit={onSubmit}
        className="modal-form-card max-w-md space-y-4"
      >
        <h1 className="page-title text-center text-xl sm:text-2xl">기존 회사 가입 신청</h1>
        <p className="page-description text-center">
          이미 등록된 회사에 가입을 신청합니다. 관리자 승인 후 로그인할 수 있습니다.
        </p>

        <div className="space-y-1">
          <label htmlFor="signup-company" className="form-label">회사</label>
          <select
            id="signup-company"
            aria-label="가입 신청할 회사 선택"
            aria-busy={companiesLoading}
            className="form-select-lg"
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
          <label htmlFor="signup-name" className="form-label">이름</label>
          <input
            id="signup-name"
            aria-label="이름"
            aria-busy={submitting}
            className="form-input-lg"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            autoComplete="name"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="signup-email" className="form-label">이메일</label>
          <input
            id="signup-email"
            type="email"
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
          <label htmlFor="signup-password" className="form-label">비밀번호</label>
          <input
            id="signup-password"
            type="password"
            aria-label="비밀번호"
            aria-busy={submitting}
            className="form-input-lg"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            autoComplete="new-password"
            placeholder={PASSWORD_REQUIREMENT_TEXT}
          />
          <p className="text-xs text-slate-500">{PASSWORD_REQUIREMENT_TEXT}</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="signup-role" className="form-label">역할</label>
          <select
            id="signup-role"
            aria-label="희망 역할 선택"
            aria-busy={submitting}
            className="form-select-lg"
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
          className="btn-primary h-11 w-full"
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
