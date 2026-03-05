/**
 * 국가별 우편번호 형식 정보 (countryCode 기준)
 * ISO 3166-1 alpha-2 사용
 */

export type PostalCodeInfo = {
  hint: string;
  pattern: RegExp | null;
  example: string;
};

const POSTAL_CODE_INFO: Record<string, PostalCodeInfo> = {
  KR: {
    hint: '5~6자리 (예: 06134, 48058)',
    pattern: /^[0-9]{5}([0-9])?$/,
    example: '06134',
  },
  US: {
    hint: 'ZIP 5자리 또는 5+4 (예: 90210, 90210-1234)',
    pattern: /^[0-9]{5}(-[0-9]{4})?$/,
    example: '90210',
  },
  GB: {
    hint: 'Postcode (예: SW1A 1AA, EC1Y 8SY)',
    pattern: /^[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}$/i,
    example: 'SW1A 1AA',
  },
  JP: {
    hint: '7자리 (예: 100-0001, 1000001)',
    pattern: /^[0-9]{3}-?[0-9]{4}$/,
    example: '100-0001',
  },
  CN: {
    hint: '6자리 (예: 100000)',
    pattern: /^[0-9]{6}$/,
    example: '100000',
  },
  CA: {
    hint: 'A1A 1A1 형식 (예: K1A 0B1)',
    pattern: /^[A-Z][0-9][A-Z]\s*[0-9][A-Z][0-9]$/i,
    example: 'K1A 0B1',
  },
  DE: {
    hint: '5자리 (예: 10115)',
    pattern: /^[0-9]{5}$/,
    example: '10115',
  },
  FR: {
    hint: '5자리 (예: 75001)',
    pattern: /^[0-9]{5}$/,
    example: '75001',
  },
  SG: {
    hint: '6자리 (예: 018956)',
    pattern: /^[0-9]{6}$/,
    example: '018956',
  },
  VN: {
    hint: '6자리 (예: 100000)',
    pattern: /^[0-9]{6}$/,
    example: '100000',
  },
  AU: {
    hint: '4자리 (예: 2000)',
    pattern: /^[0-9]{4}$/,
    example: '2000',
  },
  IN: {
    hint: '6자리 PIN (예: 110001)',
    pattern: /^[0-9]{6}$/,
    example: '110001',
  },
  MX: {
    hint: '5자리 (예: 03100)',
    pattern: /^[0-9]{5}$/,
    example: '03100',
  },
  TH: {
    hint: '5자리 (예: 10110)',
    pattern: /^[0-9]{5}$/,
    example: '10110',
  },
  IT: {
    hint: '5자리 (예: 00118)',
    pattern: /^[0-9]{5}$/,
    example: '00118',
  },
  ES: {
    hint: '5자리 (예: 28001)',
    pattern: /^[0-9]{5}$/,
    example: '28001',
  },
  NL: {
    hint: '4자리 + 2자리 (예: 1012 AB)',
    pattern: /^[0-9]{4}\s*[A-Z]{2}$/i,
    example: '1012 AB',
  },
  RU: {
    hint: '6자리 (예: 101000)',
    pattern: /^[0-9]{6}$/,
    example: '101000',
  },
  TW: {
    hint: '5자리 (3+2) (예: 10001)',
    pattern: /^[0-9]{5}$/,
    example: '10001',
  },
  HK: {
    hint: '없음 (선택 입력)',
    pattern: null,
    example: '-',
  },
  BR: {
    hint: '8자리 CEP (예: 01310-100)',
    pattern: /^[0-9]{5}-?[0-9]{3}$/,
    example: '01310-100',
  },
};

export function getPostalCodeInfo(countryCode: string | null | undefined): PostalCodeInfo | null {
  if (!countryCode?.trim()) return null;
  return POSTAL_CODE_INFO[countryCode.trim()] ?? null;
}

export type PostalCodeValidationResult = {
  valid: boolean;
  message?: string;
};

export function validatePostalCode(
  postalCode: string,
  countryCode: string | null | undefined,
): PostalCodeValidationResult {
  const trimmed = postalCode.trim();
  if (!trimmed) return { valid: true };

  const info = getPostalCodeInfo(countryCode);
  if (!info || !info.pattern) return { valid: true }; // 검증 규칙 없으면 통과

  const normalized = trimmed.replace(/\s+/g, ' ');
  if (info.pattern.test(normalized)) return { valid: true };

  return {
    valid: false,
    message: `올바른 형식이 아닙니다. (${info.hint})`,
  };
}
