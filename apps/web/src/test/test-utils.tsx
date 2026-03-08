import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ToastProvider } from '@/shared/ui/toast/toast-provider';

function AllTheProviders({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, {
    wrapper: AllTheProviders,
    ...options,
  });
}

export * from '@testing-library/react';
export { customRender as render };
