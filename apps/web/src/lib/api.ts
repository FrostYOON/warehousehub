import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
});

function getAccessToken() {
  return Cookies.get('accessToken');
}

function setAccessToken(token: string) {
  Cookies.set('accessToken', token);
}

function getRefreshToken() {
  return Cookies.get('refreshToken');
}

function setRefreshToken(token: string) {
  Cookies.set('refreshToken', token);
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let queue: Array<(token: string | null) => void> = [];

async function refreshTokens() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const res = await axios.post(
    `${API_BASE_URL}/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  );

  setAccessToken(res.data.accessToken);
  setRefreshToken(res.data.refreshToken);
  return res.data.accessToken as string;
}

api.interceptors.response.use(
  (r) => r,
  async (err: AxiosError) => {
    const original = err.config as any;

    if (err.response?.status !== 401 || original?._retry) {
      throw err;
    }

    original._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push((token) => {
          if (!token) return reject(err);
          original.headers.Authorization = `Bearer ${token}`;
          resolve(api.request(original));
        });
      });
    }

    isRefreshing = true;

    try {
      const newToken = await refreshTokens();

      queue.forEach((cb) => cb(newToken));
      queue = [];

      if (!newToken) throw err;

      original.headers.Authorization = `Bearer ${newToken}`;
      return api.request(original);
    } finally {
      isRefreshing = false;
    }
  },
);
