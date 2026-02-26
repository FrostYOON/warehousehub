'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMe, logout } from '@/features/auth/api/auth.api';
import { LOGIN_PATH } from '@/features/auth/model/constants';
import type { MeResponse } from '@/features/auth/model/types';

export function useAuthSession() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const data = await getMe();
        if (!alive) return;
        setMe(data);
      } catch {
        if (!alive) return;
        setError('Unauthorized');
        router.replace(LOGIN_PATH);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  async function signOut() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      router.replace(LOGIN_PATH);
      router.refresh();
    }
  }

  return { me, error, loggingOut, signOut };
}
