/**
 * 비밀번호 검증 규칙 (API와 동일)
 * - 8자 이상
 * - 소문자 1자 이상
 * - 대문자 1자 이상
 * - 숫자 1자 이상
 * - 특수문자(@$!%*?&#) 1자 이상
 */
export const PASSWORD_RULES = {
  minLength: 8,
  minLowercase: 1,
  minUppercase: 1,
  minNumbers: 1,
  minSymbols: 1,
} as const;

export const PASSWORD_REQUIREMENT_TEXT =
  '8자 이상, 소문자·대문자·숫자·특수문자(@$!%*?&#) 각 1자 이상';

export type PasswordValidationResult =
  | { valid: true }
  | { valid: false; message: string };

export function validatePassword(password: string): PasswordValidationResult {
  if (password.length < PASSWORD_RULES.minLength) {
    return { valid: false, message: '비밀번호는 8자 이상이어야 합니다.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: '소문자를 1자 이상 포함해야 합니다.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: '대문자를 1자 이상 포함해야 합니다.' };
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: '숫자를 1자 이상 포함해야 합니다.' };
  }
  // 영문·숫자 제외 = 특수문자 (validator.js IsStrongPassword minSymbols와 유사)
  if (!/[^A-Za-z0-9]/.test(password)) {
    return {
      valid: false,
      message: '특수문자(@$!%*?&# 등)를 1자 이상 포함해야 합니다.',
    };
  }
  return { valid: true };
}
