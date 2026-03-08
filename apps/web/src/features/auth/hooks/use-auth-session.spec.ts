import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuthSession } from './use-auth-session';
import { AuthSessionProvider } from '@/features/auth/context/auth-session-context';
import * as authApi from '@/features/auth/api/auth.api';

const mockRouterReplace = vi.fn();
const mockShowToast = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockRouterReplace,
    refresh: vi.fn(),
  }),
  usePathname: () => '/stocks',
}));

vi.mock('@/features/auth/api/auth.api', () => ({
  getMe: vi.fn(),
  getDeviceSessions: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('@/shared/ui/toast/toast-provider', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(AuthSessionProvider, null, children);
}

describe('useAuthSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('마운트 시 getMe와 getDeviceSessions를 호출한다', async () => {
    const mockMe = {
      id: '1',
      email: 'a@b.com',
      role: 'ADMIN',
      companyId: 'c1',
    } as const;
    vi.mocked(authApi.getMe).mockResolvedValue(mockMe as never);
    vi.mocked(authApi.getDeviceSessions).mockResolvedValue({
      devices: [],
      maxActiveDevices: 5,
    } as never);

    renderHook(() => useAuthSession(), { wrapper });

    await waitFor(() => {
      expect(authApi.getMe).toHaveBeenCalled();
      expect(authApi.getDeviceSessions).toHaveBeenCalled();
    });
  });

  it('getMe 실패 시 toast 표시 후 로그인 페이지로 리다이렉트한다', async () => {
    vi.mocked(authApi.getMe).mockRejectedValue(new Error('401'));
    vi.mocked(authApi.getDeviceSessions).mockRejectedValue(new Error('401'));

    renderHook(() => useAuthSession(), { wrapper });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        '인증이 만료되었습니다. 다시 로그인해주세요.',
        'error',
      );
      expect(mockRouterReplace).toHaveBeenCalledWith('/login');
    });
  });
});
