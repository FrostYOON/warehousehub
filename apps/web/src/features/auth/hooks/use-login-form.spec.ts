import { renderHook, act, waitFor } from '@testing-library/react';
import { useLoginForm } from './use-login-form';
import * as authApi from '@/features/auth/api/auth.api';

const mockRouterReplace = vi.fn();
const mockShowToast = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockRouterReplace,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/features/auth/api/auth.api', () => ({
  getLoginCompanies: vi.fn(),
  login: vi.fn(),
}));

vi.mock('@/shared/ui/toast/toast-provider', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

describe('useLoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authApi.getLoginCompanies).mockResolvedValue({
      companies: [{ id: 'c1', name: 'Test Corp' }],
    } as never);
  });

  it('마운트 시 getLoginCompanies를 호출한다', async () => {
    renderHook(() => useLoginForm());

    await waitFor(() => {
      expect(authApi.getLoginCompanies).toHaveBeenCalled();
    });
  });

  it('submit 시 login API를 호출하고 성공 시 리다이렉트한다', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      user: { role: 'ADMIN' },
    } as never);

    const { result } = renderHook(() => useLoginForm());
    await waitFor(() => expect(authApi.getLoginCompanies).toHaveBeenCalled());

    act(() => {
      result.current.setCompanyName('Test Corp');
      result.current.setEmail('user@test.com');
      result.current.setPassword('pass123');
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(authApi.login).toHaveBeenCalledWith({
      companyName: 'Test Corp',
      email: 'user@test.com',
      password: 'pass123',
    });
    expect(mockRouterReplace).toHaveBeenCalledWith('/');
  });

  it('login 실패 시 toast로 에러 메시지를 표시한다', async () => {
    vi.mocked(authApi.login).mockRejectedValue({
      response: { status: 401, data: { message: 'Invalid credentials' } },
    });

    const { result } = renderHook(() => useLoginForm());
    await waitFor(() => expect(authApi.getLoginCompanies).toHaveBeenCalled());

    act(() => {
      result.current.setCompanyName('Test Corp');
      result.current.setEmail('user@test.com');
      result.current.setPassword('wrong');
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.any(String),
      'error',
    );
  });
});
