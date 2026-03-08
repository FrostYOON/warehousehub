'use client';

import { useAuthSessionContext } from '@/features/auth/context/auth-session-context';

/**
 * 인증 세션 훅. AuthSessionProvider 내부에서만 사용 가능.
 * 페이지 전환 시에도 한 번만 fetch하여 끊김 없는 UX 제공.
 */
export function useAuthSession() {
  return useAuthSessionContext();
}
