import axios from 'axios';
import { API_BASE_URL } from '@/shared/config/env';

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const DEVICE_ID_STORAGE_KEY = 'wh_device_id';

function getDeviceId(): string | undefined {
  if (typeof window === 'undefined') return undefined;

  const existing = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (existing) return existing;

  const generated =
    typeof window.crypto?.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `wh-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, generated);
  return generated;
}

function getDeviceName(): string | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const platform = navigator.platform || 'unknown-platform';
  return `Web (${platform})`;
}

httpClient.interceptors.request.use((config) => {
  const deviceId = getDeviceId();
  const deviceName = getDeviceName();

  if (deviceId) {
    config.headers.set('X-Client-Device-Id', deviceId);
  }
  if (deviceName) {
    config.headers.set('X-Client-Device-Name', deviceName);
  }

  return config;
});
