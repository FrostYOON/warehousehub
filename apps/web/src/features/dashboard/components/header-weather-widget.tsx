'use client';

import { useQuery } from '@tanstack/react-query';
import { getWeather } from '@/features/temperature-monitor/api/temperature-monitor.api';
import { temperatureMonitorKeys } from '@/features/temperature-monitor/lib/query-keys';
import { useGeolocation } from '@/shared/hooks/use-geolocation';
import { getErrorMessage } from '@/shared/utils/get-error-message';

/** WMO weather_code → 간단한 이모지/아이콘 */
function getWeatherIcon(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 3) return '⛅';
  if (code <= 48) return '🌫️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  if (code <= 86) return '🌨️';
  if (code <= 99) return '⛈️';
  return '🌡️';
}

export function HeaderWeatherWidget() {
  const { lat, lng, error: geoError, isLoading: geoLoading } = useGeolocation();

  const weatherParams =
    lat != null && lng != null ? { lat, lng } : undefined;

  const { data, isLoading: weatherLoading, error } = useQuery({
    queryKey: temperatureMonitorKeys.weather(weatherParams?.lat, weatherParams?.lng),
    queryFn: () => getWeather(weatherParams?.lat, weatherParams?.lng),
    enabled: !geoLoading,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const isLoading = geoLoading || weatherLoading;

  if (geoError === 'permission_denied' && !data && error) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700"
        title="위치를 허용해주세요. 회사 주소가 설정되지 않으면 날씨를 조회할 수 없습니다."
      >
        <span>📍</span>
        <span>위치를 허용해주세요</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-500"
        aria-busy="true"
      >
        <span className="animate-pulse">날씨</span>
        <span className="tabular-nums">...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700"
        title={getErrorMessage(error, '날씨를 불러올 수 없습니다.')}
      >
        <span>🌡️</span>
        <span>날씨 오류</span>
      </div>
    );
  }

  if (!data) return null;

  const icon = getWeatherIcon(data.weatherCode ?? 0);
  const desc = data.description ?? '';

  return (
    <div
      className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm text-sky-800"
      title={`${desc} · ${data.source === 'company' ? '회사 위치' : '현재 위치'}`}
    >
      <span aria-hidden>{icon}</span>
      <span className="tabular-nums font-medium">{Math.round(data.temperature)}°C</span>
      <span className="hidden truncate text-sky-600 sm:inline">{desc}</span>
    </div>
  );
}
