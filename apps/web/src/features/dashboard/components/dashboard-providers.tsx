'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import * as Tooltip from '@radix-ui/react-tooltip';
import { useState } from 'react';

export function DashboardProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>
        <Tooltip.Provider delayDuration={200} skipDelayDuration={0}>
          {children}
        </Tooltip.Provider>
      </NuqsAdapter>
    </QueryClientProvider>
  );
}
