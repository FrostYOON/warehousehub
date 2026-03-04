/**
 * Decimal/숫자 값을 화면 표시용 문자열로 변환.
 * - 소수점 3자리 이하 불필요한 0 제거
 * - 정수면 소수점 없이 표시
 */
export function formatDecimalForDisplay(value: unknown): string {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return '-';
  const rounded = Math.round(n * 1000) / 1000;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(3).replace(/\.?0+$/, '');
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  if (value && typeof value === 'object') {
    const decimalLike = value as {
      toNumber?: () => number;
      toString?: () => string;
    };
    if (typeof decimalLike.toNumber === 'function') {
      const n = decimalLike.toNumber();
      if (Number.isFinite(n)) return n;
    }
    if (typeof decimalLike.toString === 'function') {
      const str = decimalLike.toString();
      if (str !== '[object Object]') {
        const n = Number(str);
        if (Number.isFinite(n)) return n;
      }
    }
  }
  return NaN;
}
