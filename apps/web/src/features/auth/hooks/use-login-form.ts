'use client';

import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { login } from '@/features/auth/api/auth.api';

export function useLoginForm() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('WarehouseHub');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
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
