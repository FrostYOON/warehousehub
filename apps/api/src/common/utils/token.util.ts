import { createHash, randomBytes } from 'crypto';

export function generateRefreshToken(): string {
  return randomBytes(64).toString('hex');
}

/** 비밀번호 재설정용 짧은 토큰 (64자 hex) */
export function generateResetToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function addDays(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

export function addHours(hours: number): Date {
  const d = new Date();
  d.setTime(d.getTime() + hours * 60 * 60 * 1000);
  return d;
}
