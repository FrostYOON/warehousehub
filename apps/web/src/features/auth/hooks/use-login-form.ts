'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { getLoginCompanies, login } from '@/features/auth/api/auth.api';
import type { LoginCompany } from '@/features/auth/model/types';

export function useLoginForm() {
  const router = useRouter();
  const [companies, setCompanies] = useState<LoginCompany[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
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
        setError('회사 목록을 불러오지 못했습니다.');
      } finally {
        if (active) setCompaniesLoading(false);
      }
    }

    loadCompanies();
    return () => {
      active = false;
    };
  }, []);

  async function submit() {
    if (!companyName) {
      setError('회사를 선택해주세요.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await login({ companyName, email, password });
      router.replace('/');
      router.refresh();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const payload = err.response?.data as { message?: string | string[] };
        if (Array.isArray(payload?.message)) {
          setError(payload.message[0] ?? 'Login failed');
        } else {
          setError(payload?.message ?? 'Login failed');
        }
      } else {
        setError('Login failed');
      }
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
    error,
    submitting,
    setCompanyName,
    setEmail,
    setPassword,
    submit,
  };
}
