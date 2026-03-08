/**
 * 고객사 주소/좌표를 Google Maps 길찾기 URL로 변환
 * lat/lng가 있으면 좌표 우선, 없으면 주소 문자열 조합
 */
export function buildGoogleMapsDirectionUrl(customer: {
  lat?: number | string | null;
  lng?: number | string | null;
  customerAddress?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}): string | null {
  const lat = customer.lat != null ? Number(customer.lat) : null;
  const lng = customer.lng != null ? Number(customer.lng) : null;

  let destination: string;

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    destination = `${lat},${lng}`;
  } else {
    const parts = [
      customer.customerAddress,
      customer.city,
      customer.state,
      customer.postalCode,
      customer.country,
    ].filter(Boolean) as string[];
    if (parts.length === 0) return null;
    destination = parts.join(', ');
  }

  const params = new URLSearchParams({
    api: '1',
    destination: destination,
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
