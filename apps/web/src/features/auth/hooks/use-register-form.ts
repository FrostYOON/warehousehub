'use client';

import { useState } from 'react';
import { getErrorMessage } from '@/shared/utils/get-error-message';
import { useRouter } from 'next/navigation';
import { register } from '@/features/auth/api/auth.api';
import type { RegisterRequest } from '@/features/auth/model/types';
import { useToast } from '@/shared/ui/toast/toast-provider';
import { validatePassword } from '@/shared/utils/validate-password';

export function useRegisterForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!companyName.trim()) {
      showToast('회사명을 입력해주세요.', 'error');
      return;
    }

    const pwResult = validatePassword(password);
    if (!pwResult.valid) {
      showToast(pwResult.message, 'error');
      return;
    }

    const payload: RegisterRequest = {
      companyName: companyName.trim(),
      name: name.trim(),
      email: email.trim(),
      password,
    };

    setSubmitting(true);
    try {
      await register(payload);
      showToast('회사 등록이 완료되었습니다.', 'success');
      router.replace('/');
      router.refresh();
    } catch (err: unknown) {
      showToast(getErrorMessage(err, '회사 등록에 실패했습니다.'), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return {
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
  };
}
