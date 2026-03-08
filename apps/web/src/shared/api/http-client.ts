import axios, { type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '@/shared/config/env';
import { LOGIN_PATH } from '@/features/auth/model/constants';

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

let isRefreshing = false;
let refreshSubscribers: Array<(token?: string) => void> = [];

function onRefreshed(token?: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token?: string) => void) {
  refreshSubscribers.push(cb);
}

function redirectToLogin() {
  if (typeof window !== 'undefined') {
    window.location.href = LOGIN_PATH;
  }
}

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (originalRequest.url?.includes('/auth/refresh')) {
      redirectToLogin();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve) => {
        addRefreshSubscriber(() => {
          resolve(httpClient(originalRequest));
        });
      });
    }

    isRefreshing = true;
    originalRequest._retry = true;

    try {
      await httpClient.post('/auth/refresh');
      onRefreshed();
      return httpClient(originalRequest);
    } catch (refreshError) {
      onRefreshed();
      redirectToLogin();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
