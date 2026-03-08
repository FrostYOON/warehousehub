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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 sm:px-6">
      <form
        onSubmit={onSubmit}
        className="modal-form-card max-w-md space-y-4"
      >
        <h1 className="page-title text-center text-xl sm:text-2xl">회사 신규 등록</h1>
        <p className="page-description text-center">
          최초 관리자로 회사와 계정을 함께 등록합니다.
        </p>

        <div className="space-y-1">
          <label htmlFor="register-company" className="form-label">회사명</label>
          <input
            id="register-company"
            aria-label="회사명"
            aria-busy={submitting}
            className="form-input-lg"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            disabled={submitting}
            placeholder="예: (주)창고허브"
            autoComplete="organization"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="register-name" className="form-label">이름</label>
          <input
            id="register-name"
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
          <label htmlFor="register-email" className="form-label">이메일</label>
          <input
            id="register-email"
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
          <label htmlFor="register-password" className="form-label">비밀번호</label>
          <input
            id="register-password"
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

        <button
          type="submit"
          disabled={submitting}
          aria-busy={submitting}
          aria-disabled={submitting}
          className="btn-primary h-11 w-full"
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
