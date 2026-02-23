import type { CookieOptions } from 'express';

export type AuthCookieConfig = {
  accessCookieName: string;
  refreshCookieName: string;
  accessMaxAgeMs: number;
  refreshMaxAgeMs: number;
  accessCookieOptions: CookieOptions;
  refreshCookieOptions: CookieOptions;
  clearAccessCookieOptions: CookieOptions;
  clearRefreshCookieOptions: CookieOptions;
};

export function getAuthCookieConfig(): AuthCookieConfig {
  const isProd = process.env.NODE_ENV === 'production';

  const sameSite =
    (process.env.COOKIE_SAMESITE as 'lax' | 'strict' | 'none' | undefined) ??
    (isProd ? 'none' : 'lax');

  const secure =
    process.env.COOKIE_SECURE != null
      ? process.env.COOKIE_SECURE === 'true'
      : isProd;

  const domain = process.env.COOKIE_DOMAIN || undefined;

  const accessCookieName = 'access_token';
  const refreshCookieName = 'refresh_token';

  // access: 짧게(예: 15분), refresh: 길게(예: 30일)
  const accessMaxAgeMs = 15 * 60 * 1000;
  const refreshMaxAgeMs = 30 * 24 * 60 * 60 * 1000;

  const base: CookieOptions = {
    httpOnly: true,
    secure,
    sameSite,
    domain,
  };

  const accessCookieOptions: CookieOptions = {
    ...base,
    path: '/', // 모든 API 호출에 포함되게
    maxAge: accessMaxAgeMs,
  };

  const refreshCookieOptions: CookieOptions = {
    ...base,
    path: '/', // logout에서도 refresh cookie를 읽어 서버 revoke 보장
    maxAge: refreshMaxAgeMs,
  };

  // clearCookie는 동일 옵션이 필요
  const clearAccessCookieOptions: CookieOptions = {
    httpOnly: true,
    secure,
    sameSite,
    domain,
    path: accessCookieOptions.path,
  };

  const clearRefreshCookieOptions: CookieOptions = {
    httpOnly: true,
    secure,
    sameSite,
    domain,
    path: refreshCookieOptions.path,
  };

  return {
    accessCookieName,
    refreshCookieName,
    accessMaxAgeMs,
    refreshMaxAgeMs,
    accessCookieOptions,
    refreshCookieOptions,
    clearAccessCookieOptions,
    clearRefreshCookieOptions,
  };
}
