import { httpClient } from '@/shared/api/http-client';
import type {
  CreateTemperatureLogPayload,
  TemperatureLogItem,
  TemperatureStatsGroupBy,
  TemperatureStatsResponse,
  WeatherResponse,
} from '../model/types';

export async function getWeather(lat?: number, lng?: number): Promise<WeatherResponse> {
  const params: Record<string, string> = {};
  if (lat != null) params.lat = String(lat);
  if (lng != null) params.lng = String(lng);
  const res = await httpClient.get<WeatherResponse>('/temperature-monitor/weather', {
    params,
  });
  return res.data;
}

export async function createTemperatureLog(
  payload: CreateTemperatureLogPayload,
): Promise<TemperatureLogItem> {
  const res = await httpClient.post<TemperatureLogItem>(
    '/temperature-monitor/logs',
    payload,
  );
  return res.data;
}

export async function listTemperatureLogs(options?: {
  page?: number;
  pageSize?: number;
}): Promise<{
  items: TemperatureLogItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const res = await httpClient.get('/temperature-monitor/logs', {
    params: options,
  });
  return res.data;
}

export async function getTodayRecordedStatus(): Promise<{ recorded: boolean }> {
  const res = await httpClient.get<{ recorded: boolean }>(
    '/temperature-monitor/today-recorded',
  );
  return res.data;
}

export async function getTemperatureStats(params: {
  from: string;
  to: string;
  groupBy?: TemperatureStatsGroupBy;
}): Promise<TemperatureStatsResponse> {
  const res = await httpClient.get<TemperatureStatsResponse>(
    '/temperature-monitor/stats',
    { params },
  );
  return res.data;
}
