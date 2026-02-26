'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getDeviceSessions,
  getMe,
  logout,
  logoutOtherDevices,
  revokeDeviceSession,
} from '@/features/auth/api/auth.api';
import { LOGIN_PATH } from '@/features/auth/model/constants';
import type {
  DeviceSession,
  DeviceSessionsResponse,
  MeResponse,
} from '@/features/auth/model/types';

export function useAuthSession() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [maxActiveDevices, setMaxActiveDevices] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);
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
        setError('Unauthorized');
        router.replace(LOGIN_PATH);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  async function refreshDevices() {
    setLoadingDevices(true);
    try {
      const data: DeviceSessionsResponse = await getDeviceSessions();
      setDevices(data.devices);
      setMaxActiveDevices(data.maxActiveDevices);
    } catch {
      setError('디바이스 목록을 불러오지 못했습니다.');
    } finally {
      setLoadingDevices(false);
    }
  }

  async function revokeDevice(sessionId: string) {
    setDeviceActionId(sessionId);
    setError(null);
    try {
      await revokeDeviceSession(sessionId);
      await refreshDevices();
    } catch {
      setError('디바이스 로그아웃에 실패했습니다.');
    } finally {
      setDeviceActionId(null);
    }
  }

  async function signOutOthers() {
    setLoggingOutOthers(true);
    setError(null);
    try {
      await logoutOtherDevices();
      await refreshDevices();
    } catch {
      setError('다른 디바이스 로그아웃에 실패했습니다.');
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

  return {
    me,
    devices,
    maxActiveDevices,
    error,
    loggingOut,
    loadingDevices,
    deviceActionId,
    loggingOutOthers,
    signOut,
    revokeDevice,
    signOutOthers,
  };
}
