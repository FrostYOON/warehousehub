'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 재고 실사 기능 제거 (Phase 1).
 * /stocktaking 접근 시 /stocks로 리다이렉트.
 */
export default function StocktakingRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/stocks');
  }, [router]);

  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"
        aria-hidden
      />
    </div>
  );
}
