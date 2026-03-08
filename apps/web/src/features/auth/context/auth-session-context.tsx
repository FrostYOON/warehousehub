'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  approveCompanyUser,
  deleteCompanyUser,
  getCompanyUsers,
  getDeviceSessions,
  getMe,
  logout,
  logoutOtherDevices,
  revokeDeviceSession,
} from '@/features/auth/api/auth.api';
import { LOGIN_PATH } from '@/features/auth/model/constants';
import { getErrorMessage } from '@/shared/utils/get-error-message';
import { useToast } from '@/shared/ui/toast/toast-provider';
import type {
  CompanyUser,
  DeviceSession,
  DeviceSessionsResponse,
  MeResponse,
} from '@/features/auth/model/types';

export type AuthSessionValue = {
  me: MeResponse | null | undefined;
  loadingMe: boolean;
  devices: DeviceSession[];
  maxActiveDevices: number;
  loggingOut: boolean;
  loadingDevices: boolean;
  pendingUsers: CompanyUser[];
  loadingPendingUsers: boolean;
  approveActionId: string | null;
  deviceActionId: string | null;
  loggingOutOthers: boolean;
  rejectActionId: string | null;
  signOut: () => Promise<void>;
  revokeDevice: (sessionId: string) => Promise<void>;
  signOutOthers: () => Promise<void>;
  approveUser: (userId: string) => Promise<void>;
  rejectUser: (userId: string) => Promise<void>;
  refreshMe: () => Promise<void>;
  refreshPendingUsers: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionValue | null>(null);

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();
  const [me, setMe] = useState<MeResponse | null | undefined>(undefined);
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [maxActiveDevices, setMaxActiveDevices] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<CompanyUser[]>([]);
  const [loadingPendingUsers, setLoadingPendingUsers] = useState(false);
  const [approveActionId, setApproveActionId] = useState<string | null>(null);
  const [rejectActionId, setRejectActionId] = useState<string | null>(null);
  const [deviceActionId, setDeviceActionId] = useState<string | null>(null);
  const [loggingOutOthers, setLoggingOutOthers] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [meData, deviceData] = await Promise.all([
          getMe(),
          getDeviceSessions(),
        ]);
        if (!alive) return;
        setMe(meData);
        setDevices(deviceData.devices);
        setMaxActiveDevices(deviceData.maxActiveDevices);
      } catch {
        if (!alive) return;
        setMe(null);
        showToast('인증이 만료되었습니다. 다시 로그인해주세요.', 'error');
        router.replace(LOGIN_PATH);
      }
    })();
    return () => {
      alive = false;
    };
  }, [router, showToast]);

  useEffect(() => {
    if (pathname !== '/approvals' || me?.role !== 'ADMIN') return;
    let alive = true;
    setLoadingPendingUsers(true);
    getCompanyUsers({ isActive: false, limit: 100 }, { noCache: true })
      .then((data) => {
        if (!alive) return;
        setPendingUsers(data?.items ?? []);
      })
      .catch((err) => {
        if (!alive) return;
        const ax = err as {
          response?: { status?: number; data?: unknown };
          message?: string;
        };
        console.error('[AuthSessionProvider] 승인 대기 목록 로드 실패:', ax);
        setPendingUsers([]);
        const resData = ax.response?.data as
          | { message?: string | string[] }
          | undefined;
        const apiMsg = Array.isArray(resData?.message)
          ? resData.message[0]
          : resData?.message;
        const status = ax.response?.status;
        const msg =
          apiMsg ||
          (status === 401
            ? '인증이 만료되었습니다. 다시 로그인해주세요.'
            : status === 403
              ? '관리자 권한이 필요합니다.'
              : !ax.response
                ? '네트워크 연결을 확인해주세요.'
                : '승인 대기 사용자 목록을 불러오지 못했습니다.');
        showToast(
          typeof msg === 'string' ? msg : '승인 대기 사용자 목록을 불러오지 못했습니다.',
          'error',
        );
      })
      .finally(() => {
        if (alive) setLoadingPendingUsers(false);
      });
    return () => {
      alive = false;
    };
  }, [pathname, me?.role, showToast]);

  const refreshPendingUsers = useCallback(async () => {
    if (me?.role !== 'ADMIN') return;
    setLoadingPendingUsers(true);
    try {
      const data = await getCompanyUsers(
        { isActive: false, limit: 100 },
        { noCache: true },
      );
      setPendingUsers(data?.items ?? []);
    } catch (err) {
      setPendingUsers([]);
      showToast(
        getErrorMessage(err, '승인 대기 목록을 불러오지 못했습니다.'),
        'error',
      );
    } finally {
      setLoadingPendingUsers(false);
    }
  }, [me?.role, showToast]);

  const refreshMe = useCallback(async () => {
    try {
      const meData = await getMe();
      setMe(meData);
    } catch {
      showToast('계정 정보를 불러오지 못했습니다.', 'error');
    }
  }, [showToast]);

  const refreshDevices = useCallback(async () => {
    setLoadingDevices(true);
    try {
      const data: DeviceSessionsResponse = await getDeviceSessions();
      setDevices(data.devices);
      setMaxActiveDevices(data.maxActiveDevices);
    } catch {
      showToast('디바이스 목록을 불러오지 못했습니다.', 'error');
    } finally {
      setLoadingDevices(false);
    }
  }, [showToast]);

  const revokeDevice = useCallback(
    async (sessionId: string) => {
      setDeviceActionId(sessionId);
      try {
        await revokeDeviceSession(sessionId);
        await refreshDevices();
        showToast('디바이스를 로그아웃했습니다.', 'success');
      } catch {
        showToast('디바이스 로그아웃에 실패했습니다.', 'error');
      } finally {
        setDeviceActionId(null);
      }
    },
    [refreshDevices, showToast],
  );

  const signOutOthers = useCallback(async () => {
    setLoggingOutOthers(true);
    try {
      const result = await logoutOtherDevices();
      await refreshDevices();
      if (result.revokedCount > 0) {
        showToast(
          `다른 디바이스 ${result.revokedCount}대를 로그아웃했습니다.`,
          'success',
        );
      } else {
        showToast('로그아웃할 다른 디바이스가 없습니다.', 'info');
      }
    } catch {
      showToast('다른 디바이스 로그아웃에 실패했습니다.', 'error');
    } finally {
      setLoggingOutOthers(false);
    }
  }, [refreshDevices, showToast]);

  const signOut = useCallback(async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      router.replace(LOGIN_PATH);
      router.refresh();
    }
  }, [router]);

  const approveUser = useCallback(async (userId: string) => {
    setApproveActionId(userId);
    try {
      await approveCompanyUser(userId);
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      showToast('회원가입 신청을 승인했습니다.', 'success');
    } catch {
      showToast('회원 승인 처리에 실패했습니다.', 'error');
    } finally {
      setApproveActionId(null);
    }
  }, [showToast]);

  const rejectUser = useCallback(
    async (userId: string) => {
      setRejectActionId(userId);
      try {
        await deleteCompanyUser(userId);
        setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
        showToast('회원가입 신청을 거절했습니다.', 'success');
      } catch (err: unknown) {
        showToast(getErrorMessage(err, '거절 처리에 실패했습니다.'), 'error');
      } finally {
        setRejectActionId(null);
      }
    },
    [showToast],
  );

  const loadingMe = me === undefined;

  const value: AuthSessionValue = {
    me,
    loadingMe,
    devices,
    maxActiveDevices,
    loggingOut,
    loadingDevices,
    pendingUsers,
    loadingPendingUsers,
    approveActionId,
    deviceActionId,
    loggingOutOthers,
    rejectActionId,
    signOut,
    revokeDevice,
    signOutOthers,
    approveUser,
    rejectUser,
    refreshMe,
    refreshPendingUsers,
  };

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSessionContext(): AuthSessionValue {
  const ctx = useContext(AuthSessionContext);
  if (!ctx) {
    throw new Error('useAuthSessionContext must be used within AuthSessionProvider');
  }
  return ctx;
}
