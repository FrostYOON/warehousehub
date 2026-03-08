'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getLoginCompanies, forgotPassword } from '@/features/auth/api/auth.api';
import type { LoginCompany } from '@/features/auth/model/types';
import { LOGIN_PATH } from '@/features/auth/model/constants';
import { useToast } from '@/shared/ui/toast/toast-provider';

export function ForgotPasswordForm() {
  const { showToast } = useToast();
  const [companies, setCompanies] = useState<LoginCompany[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadCompanies() {
      setCompaniesLoading(true);
      try {
        const res = await getLoginCompanies();
        if (!active) return;
        setCompanies(res.companies);
        if (res.companies.length > 0) {
          setCompanyName(res.companies[0]!.name);
        }
      } catch {
        if (!active) return;
        showToast('회사 목록을 불러오지 못했습니다.', 'error');
      } finally {
        if (active) setCompaniesLoading(false);
      }
    }

    loadCompanies();
    return () => {
      active = false;
    };
  }, [showToast]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName || !email.trim()) {
      showToast('회사와 이메일을 입력해주세요.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await forgotPassword({ companyName, email: email.trim() });
      setSent(true);
      showToast('재설정 메일이 발송되었습니다.', 'success');
    } catch {
      showToast('요청 처리에 실패했습니다. 다시 시도해주세요.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-center text-xl font-semibold sm:text-2xl">
            비밀번호 찾기
          </h1>
          <p className="text-center text-sm text-slate-600">
            입력하신 이메일 주소로 비밀번호 재설정 링크를 발송했습니다.
            <br />
            (개발 환경에서는 콘솔 로그를 확인해주세요)
          </p>
          <Link
            href={LOGIN_PATH}
            className="block h-11 w-full rounded-lg bg-slate-900 px-3 text-center text-sm font-medium leading-[2.75rem] text-white transition hover:bg-slate-800"
          >
            로그인으로 돌아가기
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
          비밀번호 찾기
        </h1>
        <p className="text-center text-sm text-slate-600">
          가입 시 사용한 회사와 이메일을 입력하면 재설정 링크를 발송합니다.
        </p>

        <div className="space-y-1">
          <label htmlFor="forgot-company" className="text-sm font-medium text-slate-700">
            회사
          </label>
          <select
            id="forgot-company"
            aria-label="비밀번호 재설정을 요청할 회사 선택"
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
          <label htmlFor="forgot-email" className="text-sm font-medium text-slate-700">
            이메일
          </label>
          <input
            id="forgot-email"
            type="email"
            aria-label="가입 시 사용한 이메일"
            aria-busy={submitting}
            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            autoComplete="email"
            placeholder="가입 시 사용한 이메일"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || companiesLoading || companies.length === 0}
          aria-busy={submitting}
          aria-disabled={submitting || companiesLoading || companies.length === 0}
          className="h-11 w-full rounded-lg bg-slate-900 px-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {submitting ? '발송 중...' : '재설정 메일 발송'}
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
