'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { getLoginCompanies, login } from '@/features/auth/api/auth.api';
import { getErrorMessage } from '@/shared/utils/get-error-message';
import type { LoginCompany } from '@/features/auth/model/types';
import { useToast } from '@/shared/ui/toast/toast-provider';

export function useLoginForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const [companies, setCompanies] = useState<LoginCompany[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

    setSubmitting(true);

    try {
      const res = await login({
        companyName: companyName.trim(),
        email: email.trim(),
        password: password.trim(),
      });
      const defaultPath = res?.user?.role === 'ADMIN' ? '/' : '/stocks';
      router.replace(defaultPath);
      router.refresh();
    } catch (err: unknown) {
      const toastMsg =
        axios.isAxiosError(err) && err.response?.status === 401
          ? '회사명, 이메일, 비밀번호를 확인해주세요. 비밀번호를 잊으셨다면 비밀번호 찾기를 이용해주세요.'
          : getErrorMessage(err, '로그인에 실패했습니다.');
      showToast(toastMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return {
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
  };
}
