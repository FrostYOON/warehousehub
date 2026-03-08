import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTemperatureLogDto } from './dto/create-temperature-log.dto';
import {
  TemperatureStatsGroupBy,
  TemperatureStatsQueryDto,
} from './dto/temperature-stats-query.dto';

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';

/** WMO weather_code → 한글 설명 (Open-Meteo 사용 코드) */
const WMO_DESCRIPTIONS: Record<number, string> = {
  0: '맑음',
  1: '대체로 맑음',
  2: '약간 흐림',
  3: '흐림',
  45: '안개',
  48: '서리 안개',
  51: '이슬비',
  53: '이슬비',
  55: '이슬비',
  56: '냉이슬비',
  57: '냉이슬비',
  61: '비',
  63: '비',
  65: '폭우',
  66: '냉비',
  67: '냉폭우',
  71: '눈',
  73: '눈',
  75: '폭설',
  77: '눈송이',
  80: '소나기',
  81: '소나기',
  82: '폭우',
  85: '눈 소나기',
  86: '폭설',
  95: '뇌우',
  96: '뇌우·우박',
  99: '뇌우·우박',
};

function getWeatherDescription(code: number): string {
  return WMO_DESCRIPTIONS[code] ?? '알 수 없음';
}

/** COOL 적정: 2~8°C */
const COOL_MIN = 2;
const COOL_MAX = 8;

/** FRZ 적정: -18°C 이하 */
const FRZ_MAX = -18;

function toDecimal(v: number | null | undefined): Prisma.Decimal | null {
  if (v == null || Number.isNaN(v)) return null;
  return new Prisma.Decimal(v);
}

function decimalToNumber(d: Prisma.Decimal | null | undefined): number | null {
  if (d == null) return null;
  return Number(d);
}

@Injectable()
export class TemperatureMonitorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Open-Meteo API로 현재 날씨 조회 (위도/경도)
   * temperature, weather_code, description 포함
   */
  async getWeather(lat: number, lng: number): Promise<{
    temperature: number;
    weatherCode: number;
    description: string;
    latitude: number;
    longitude: number;
    time: string;
  }> {
    const url = new URL(OPEN_METEO_BASE);
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lng));
    url.searchParams.set('current', 'temperature_2m,weather_code');
    url.searchParams.set('timezone', 'auto');

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`Open-Meteo API error: ${res.status}`);
    }
    const data = (await res.json()) as {
      current?: {
        temperature_2m?: number;
        weather_code?: number;
        time?: string;
      };
      latitude?: number;
      longitude?: number;
    };
    const temp = data.current?.temperature_2m ?? null;
    if (temp == null) {
      throw new Error('Open-Meteo: temperature_2m not found');
    }
    const weatherCode = data.current?.weather_code ?? 0;
    return {
      temperature: temp,
      weatherCode,
      description: getWeatherDescription(weatherCode),
      latitude: data.latitude ?? lat,
      longitude: data.longitude ?? lng,
      time: data.current?.time ?? new Date().toISOString(),
    };
  }

  /**
   * 회사 기본 좌표 조회 (Company lat/lng)
   */
  async getCompanyCoordinates(companyId: string): Promise<{
    lat: number;
    lng: number;
  } | null> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { lat: true, lng: true },
    });
    if (!company?.lat || !company?.lng) return null;
    return {
      lat: Number(company.lat),
      lng: Number(company.lng),
    };
  }

  /**
   * 날씨 조회 - lat/lng 직접 전달 또는 회사 좌표 사용
   */
  async fetchWeather(
    companyId: string,
    lat?: number,
    lng?: number,
  ): Promise<{
    temperature: number;
    weatherCode: number;
    description: string;
    latitude: number;
    longitude: number;
    time: string;
    source: 'param' | 'company';
  }> {
    let useLat = lat;
    let useLng = lng;
    let source: 'param' | 'company' = 'param';

    if (useLat == null || useLng == null) {
      const coords = await this.getCompanyCoordinates(companyId);
      if (!coords) {
        throw new Error(
          '위치 정보가 없습니다. 회사 주소를 설정하거나 위도/경도를 입력해주세요.',
        );
      }
      useLat = coords.lat;
      useLng = coords.lng;
      source = 'company';
    }

    const weather = await this.getWeather(useLat, useLng);
    return { ...weather, source };
  }

  /** COOL 적정 여부: 2~8°C */
  static checkCoolOk(temp: number | null | undefined): boolean | null {
    if (temp == null || Number.isNaN(temp)) return null;
    return temp >= COOL_MIN && temp <= COOL_MAX;
  }

  /** FRZ 적정 여부: -18°C 이하 */
  static checkFrzOk(temp: number | null | undefined): boolean | null {
    if (temp == null || Number.isNaN(temp)) return null;
    return temp <= FRZ_MAX;
  }

  /**
   * 온도 로그 기입 (COOL/FRZ)
   */
  async createLog(
    companyId: string,
    userId: string | undefined,
    dto: CreateTemperatureLogDto,
  ) {
    const coolOk = TemperatureMonitorService.checkCoolOk(dto.coolTemp);
    const frzOk = TemperatureMonitorService.checkFrzOk(dto.frzTemp);

    const log = await this.prisma.temperatureLog.create({
      data: {
        companyId,
        recordedByUserId: userId ?? null,
        locationLat: dto.locationLat != null ? toDecimal(dto.locationLat) : null,
        locationLng: dto.locationLng != null ? toDecimal(dto.locationLng) : null,
        weatherTemp: dto.weatherTemp != null ? toDecimal(dto.weatherTemp) : null,
        coolTemp: dto.coolTemp != null ? toDecimal(dto.coolTemp) : null,
        coolOk,
        frzTemp: dto.frzTemp != null ? toDecimal(dto.frzTemp) : null,
        frzOk,
        memo: dto.memo ?? null,
      },
      include: {
        recordedByUser: { select: { name: true, email: true } },
      },
    });

    return {
      id: log.id,
      createdAt: log.createdAt.toISOString(),
      locationLat: decimalToNumber(log.locationLat),
      locationLng: decimalToNumber(log.locationLng),
      weatherTemp: decimalToNumber(log.weatherTemp),
      coolTemp: decimalToNumber(log.coolTemp),
      coolOk: log.coolOk,
      frzTemp: decimalToNumber(log.frzTemp),
      frzOk: log.frzOk,
      memo: log.memo,
      recordedBy: log.recordedByUser
        ? { name: log.recordedByUser.name, email: log.recordedByUser.email }
        : null,
    };
  }

  /**
   * 통계 조회 - 시간별/일별 집계
   */
  async getStats(
    companyId: string,
    query: TemperatureStatsQueryDto,
  ): Promise<{
    groupBy: TemperatureStatsGroupBy;
    from: string;
    to: string;
    series: Array<{
      label: string;
      bucket: string;
      count: number;
      avgWeatherTemp: number | null;
      avgCoolTemp: number | null;
      avgFrzTemp: number | null;
      coolOkRate: number | null;
      frzOkRate: number | null;
    }>;
  }> {
    const now = new Date();
    const defaultTo = new Date(now);
    defaultTo.setHours(23, 59, 59, 999);
    const defaultFrom = new Date(now);
    defaultFrom.setDate(defaultFrom.getDate() - 7);
    defaultFrom.setHours(0, 0, 0, 0);

    const from = query.from ? new Date(query.from) : defaultFrom;
    const to = query.to ? new Date(query.to) : defaultTo;
    const groupBy = query.groupBy ?? TemperatureStatsGroupBy.DAY;

    const logs = await this.prisma.temperatureLog.findMany({
      where: {
        companyId,
        createdAt: { gte: from, lte: to },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        createdAt: true,
        weatherTemp: true,
        coolTemp: true,
        frzTemp: true,
        coolOk: true,
        frzOk: true,
      },
    });

    const bucketMap = new Map<
      string,
      {
        count: number;
        weatherSum: number;
        weatherCnt: number;
        coolSum: number;
        coolCnt: number;
        frzSum: number;
        frzCnt: number;
        coolOkCnt: number;
        coolOkTotal: number;
        frzOkCnt: number;
        frzOkTotal: number;
      }
    >();

    const getBucket = (d: Date): string => {
      if (groupBy === TemperatureStatsGroupBy.HOUR) {
        return d.toISOString().slice(0, 13) + ':00';
      }
      if (groupBy === TemperatureStatsGroupBy.MONTH) {
        return d.toISOString().slice(0, 7);
      }
      return d.toISOString().slice(0, 10);
    };

    for (const log of logs) {
      const bucket = getBucket(log.createdAt);
      let entry = bucketMap.get(bucket);
      if (!entry) {
        entry = {
          count: 0,
          weatherSum: 0,
          weatherCnt: 0,
          coolSum: 0,
          coolCnt: 0,
          frzSum: 0,
          frzCnt: 0,
          coolOkCnt: 0,
          coolOkTotal: 0,
          frzOkCnt: 0,
          frzOkTotal: 0,
        };
        bucketMap.set(bucket, entry);
      }
      entry.count += 1;
      const w = decimalToNumber(log.weatherTemp);
      if (w != null) {
        entry.weatherSum += w;
        entry.weatherCnt += 1;
      }
      const c = decimalToNumber(log.coolTemp);
      if (c != null) {
        entry.coolSum += c;
        entry.coolCnt += 1;
      }
      const f = decimalToNumber(log.frzTemp);
      if (f != null) {
        entry.frzSum += f;
        entry.frzCnt += 1;
      }
      if (log.coolOk != null) {
        entry.coolOkTotal += 1;
        if (log.coolOk) entry.coolOkCnt += 1;
      }
      if (log.frzOk != null) {
        entry.frzOkTotal += 1;
        if (log.frzOk) entry.frzOkCnt += 1;
      }
    }

    const series = Array.from(bucketMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([bucket, e]) => ({
        label: bucket,
        bucket,
        count: e.count,
        avgWeatherTemp:
          e.weatherCnt > 0 ? Math.round((e.weatherSum / e.weatherCnt) * 100) / 100 : null,
        avgCoolTemp:
          e.coolCnt > 0 ? Math.round((e.coolSum / e.coolCnt) * 100) / 100 : null,
        avgFrzTemp:
          e.frzCnt > 0 ? Math.round((e.frzSum / e.frzCnt) * 100) / 100 : null,
        coolOkRate:
          e.coolOkTotal > 0
            ? Math.round((e.coolOkCnt / e.coolOkTotal) * 1000) / 10
            : null,
        frzOkRate:
          e.frzOkTotal > 0
            ? Math.round((e.frzOkCnt / e.frzOkTotal) * 1000) / 10
            : null,
      }));

    return {
      groupBy,
      from: from.toISOString(),
      to: to.toISOString(),
      series,
    };
  }

  /**
   * 오늘 COOL/FRZ 온도 기록 여부
   */
  async getTodayRecordedStatus(companyId: string): Promise<{ recorded: boolean }> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const count = await this.prisma.temperatureLog.count({
      where: {
        companyId,
        createdAt: { gte: startOfToday, lt: endOfToday },
      },
    });
    return { recorded: count > 0 };
  }

  /**
   * 최근 로그 목록 (페이지네이션)
   */
  async listLogs(
    companyId: string,
    options: { page?: number; pageSize?: number } = {},
  ) {
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.temperatureLog.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          recordedByUser: { select: { name: true, email: true } },
        },
      }),
      this.prisma.temperatureLog.count({ where: { companyId } }),
    ]);

    return {
      items: items.map((log) => ({
        id: log.id,
        createdAt: log.createdAt.toISOString(),
        locationLat: decimalToNumber(log.locationLat),
        locationLng: decimalToNumber(log.locationLng),
        weatherTemp: decimalToNumber(log.weatherTemp),
        coolTemp: decimalToNumber(log.coolTemp),
        coolOk: log.coolOk,
        frzTemp: decimalToNumber(log.frzTemp),
        frzOk: log.frzOk,
        memo: log.memo,
        recordedBy: log.recordedByUser
          ? { name: log.recordedByUser.name, email: log.recordedByUser.email }
          : null,
      })),
      total,
      page,
      pageSize,
    };
  }
}
