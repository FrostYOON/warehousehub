'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  approveCompanyUser,
  getCompanyUsers,
  getDeviceSessions,
  getMe,
  logout,
  logoutOtherDevices,
  revokeDeviceSession,
} from '@/features/auth/api/auth.api';
import { LOGIN_PATH } from '@/features/auth/model/constants';
import { useToast } from '@/shared/ui/toast/toast-provider';
import type {
  CompanyUser,
  DeviceSession,
  DeviceSessionsResponse,
  MeResponse,
} from '@/features/auth/model/types';

export function useAuthSession() {
  const router = useRouter();
  const { showToast } = useToast();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [maxActiveDevices, setMaxActiveDevices] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<CompanyUser[]>([]);
  const [loadingPendingUsers, setLoadingPendingUsers] = useState(false);
  const [approveActionId, setApproveActionId] = useState<string | null>(null);
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
        if (meData.role === 'ADMIN') {
          setLoadingPendingUsers(true);
          try {
            const users = await getCompanyUsers();
            if (!alive) return;
            setPendingUsers(users.filter((user) => !user.isActive));
          } catch {
            if (!alive) return;
            showToast('승인 대기 사용자 목록을 불러오지 못했습니다.', 'error');
          } finally {
            if (alive) setLoadingPendingUsers(false);
          }
        }
      } catch {
        if (!alive) return;
        showToast('인증이 만료되었습니다. 다시 로그인해주세요.', 'error');
        router.replace(LOGIN_PATH);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router, showToast]);

  async function refreshPendingUsers() {
    if (me?.role !== 'ADMIN') return;
    setLoadingPendingUsers(true);
    try {
      const users = await getCompanyUsers();
      setPendingUsers(users.filter((user) => !user.isActive));
    } catch {
      showToast('승인 대기 사용자 목록을 불러오지 못했습니다.', 'error');
    } finally {
      setLoadingPendingUsers(false);
    }
  }

  async function refreshMe() {
    try {
      const meData = await getMe();
      setMe(meData);
    } catch {
      showToast('계정 정보를 불러오지 못했습니다.', 'error');
    }
  }

  async function refreshDevices() {
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
  }

  async function revokeDevice(sessionId: string) {
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
  }

  async function signOutOthers() {
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
  }

  async function signOut() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      router.replace(LOGIN_PATH);
      router.refresh();
    }
  }

  async function approveUser(userId: string) {
    setApproveActionId(userId);
    try {
      await approveCompanyUser(userId);
      await refreshPendingUsers();
      showToast('회원가입 신청을 승인했습니다.', 'success');
    } catch {
      showToast('회원 승인 처리에 실패했습니다.', 'error');
    } finally {
      setApproveActionId(null);
    }
  }

  return {
    me,
    devices,
    maxActiveDevices,
    loggingOut,
    loadingDevices,
    pendingUsers,
    loadingPendingUsers,
    approveActionId,
    deviceActionId,
    loggingOutOthers,
    signOut,
    revokeDevice,
    signOutOthers,
    approveUser,
    refreshMe,
  };
}
