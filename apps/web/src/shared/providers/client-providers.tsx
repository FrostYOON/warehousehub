'use client';

import { ToastProvider } from '@/shared/ui/toast/toast-provider';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
