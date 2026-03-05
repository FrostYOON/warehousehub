'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { getLoginCompanies, signupRequest } from '@/features/auth/api/auth.api';
import type { LoginCompany, SignupRequest, UserRole } from '@/features/auth/model/types';
import { useToast } from '@/shared/ui/toast/toast-provider';
import { validatePassword } from '@/shared/utils/validate-password';

const ROLE_OPTIONS: Array<Exclude<UserRole, 'ADMIN'>> = [
  'WH_MANAGER',
  'DELIVERY',
  'ACCOUNTING',
  'SALES',
];

export function useSignupForm() {
  const { showToast } = useToast();
  const [companies, setCompanies] = useState<LoginCompany[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Exclude<UserRole, 'ADMIN'>>('SALES');
  const [submitting, setSubmitting] = useState(false);

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

  async function submit() {
    if (!companyName) {
      showToast('회사를 선택해주세요.', 'error');
      return;
    }

    const pwResult = validatePassword(password);
    if (!pwResult.valid) {
      showToast(pwResult.message, 'error');
      return;
    }

    const payload: SignupRequest = {
      companyName,
      email,
      name,
      password,
      role,
    };

    setSubmitting(true);
    try {
      await signupRequest(payload);
      showToast(
        '가입 신청이 완료되었습니다. 회사 관리자 승인 후 로그인할 수 있습니다.',
        'success',
      );
      setEmail('');
      setName('');
      setPassword('');
      setRole('SALES');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { message?: string | string[] };
        if (Array.isArray(data?.message)) {
          showToast(data.message[0] ?? '회원가입 신청에 실패했습니다.', 'error');
        } else {
          showToast(data?.message ?? '회원가입 신청에 실패했습니다.', 'error');
        }
      } else {
        showToast('회원가입 신청에 실패했습니다.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return {
    companies,
    companiesLoading,
    roleOptions: ROLE_OPTIONS,
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
  };
}
