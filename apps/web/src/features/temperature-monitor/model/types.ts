export type WeatherResponse = {
  temperature: number;
  weatherCode?: number;
  description?: string;
  latitude: number;
  longitude: number;
  time: string;
  source: 'param' | 'company';
};

export type TemperatureLogItem = {
  id: string;
  createdAt: string;
  locationLat: number | null;
  locationLng: number | null;
  weatherTemp: number | null;
  coolTemp: number | null;
  coolOk: boolean | null;
  frzTemp: number | null;
  frzOk: boolean | null;
  memo: string | null;
  recordedBy: { name: string; email: string } | null;
};

export type CreateTemperatureLogPayload = {
  locationLat?: number;
  locationLng?: number;
  weatherTemp?: number;
  coolTemp?: number;
  frzTemp?: number;
  memo?: string;
};

export type TemperatureStatsGroupBy = 'HOUR' | 'DAY' | 'MONTH';

export type TemperatureStatsSeriesPoint = {
  label: string;
  bucket: string;
  count: number;
  avgWeatherTemp: number | null;
  avgCoolTemp: number | null;
  avgFrzTemp: number | null;
  coolOkRate: number | null;
  frzOkRate: number | null;
};

export type TemperatureStatsResponse = {
  groupBy: TemperatureStatsGroupBy;
  from: string;
  to: string;
  series: TemperatureStatsSeriesPoint[];
};
