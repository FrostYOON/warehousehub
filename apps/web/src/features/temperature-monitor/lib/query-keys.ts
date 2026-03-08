export const temperatureMonitorKeys = {
  all: ['temperature-monitor'] as const,
  todayRecorded: () => [...temperatureMonitorKeys.all, 'today-recorded'] as const,
  weather: (lat?: number, lng?: number) =>
    [...temperatureMonitorKeys.all, 'weather', lat, lng] as const,
  logs: (page?: number, pageSize?: number) =>
    [...temperatureMonitorKeys.all, 'logs', page, pageSize] as const,
  stats: (from: string, to: string, groupBy: string) =>
    [...temperatureMonitorKeys.all, 'stats', from, to, groupBy] as const,
};
