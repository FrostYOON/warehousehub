/**
 * ISO 3166-1 alpha-2 국가 코드 및 표시명
 * 멀티 리전(한국, 미국, 일본, 중국 등) 지원용
 */
export type CountryOption = {
  value: string;
  label: string;
};

export const COUNTRY_OPTIONS: CountryOption[] = [
  { value: '', label: '선택' },
  { value: 'KR', label: '대한민국' },
  { value: 'US', label: '미국' },
  { value: 'JP', label: '일본' },
  { value: 'CN', label: '중국' },
  { value: 'CA', label: '캐나다' },
  { value: 'GB', label: '영국' },
  { value: 'DE', label: '독일' },
  { value: 'FR', label: '프랑스' },
  { value: 'SG', label: '싱가포르' },
  { value: 'VN', label: '베트남' },
  { value: 'AU', label: '호주' },
  { value: 'IN', label: '인도' },
  { value: 'MX', label: '멕시코' },
  { value: 'TH', label: '태국' },
  { value: 'ID', label: '인도네시아' },
  { value: 'MY', label: '말레이시아' },
  { value: 'PH', label: '필리핀' },
  { value: 'IT', label: '이탈리아' },
  { value: 'ES', label: '스페인' },
  { value: 'NL', label: '네덜란드' },
  { value: 'BE', label: '벨기에' },
  { value: 'PL', label: '폴란드' },
  { value: 'RU', label: '러시아' },
  { value: 'TW', label: '대만' },
  { value: 'HK', label: '홍콩' },
  { value: 'BR', label: '브라질' },
  { value: 'ZA', label: '남아프리카공화국' },
];

/**
 * countryCode → 국가명 매핑 (표시용)
 */
const COUNTRY_LABEL_MAP = new Map(
  COUNTRY_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label]),
);

export function getCountryLabel(countryCode: string | null | undefined): string {
  if (!countryCode?.trim()) return '-';
  return COUNTRY_LABEL_MAP.get(countryCode.trim()) ?? countryCode;
}
