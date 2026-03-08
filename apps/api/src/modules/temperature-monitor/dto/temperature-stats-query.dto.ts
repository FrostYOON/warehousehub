import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum TemperatureStatsGroupBy {
  HOUR = 'HOUR',
  DAY = 'DAY',
  MONTH = 'MONTH',
}

export class TemperatureStatsQueryDto {
  @ApiPropertyOptional({
    required: false,
    enum: TemperatureStatsGroupBy,
    default: TemperatureStatsGroupBy.DAY,
    description: '집계 단위 (시간별/일별)',
  })
  @IsOptional()
  @IsEnum(TemperatureStatsGroupBy)
  groupBy: TemperatureStatsGroupBy = TemperatureStatsGroupBy.DAY;

  @ApiPropertyOptional({
    required: false,
    description: '시작일 (YYYY-MM-DD)',
    example: '2025-03-01',
  })
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({
    required: false,
    description: '종료일 (YYYY-MM-DD)',
    example: '2025-03-05',
  })
  @IsOptional()
  to?: string;
}
