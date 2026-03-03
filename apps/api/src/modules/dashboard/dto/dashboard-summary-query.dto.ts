import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';

export enum DashboardAnalyticsRange {
  WEEK = 'WEEK',
  QUARTER = 'QUARTER',
  HALF = 'HALF',
  YEAR = 'YEAR',
}

export enum DashboardSegmentBy {
  WAREHOUSE_TYPE = 'WAREHOUSE_TYPE',
  CUSTOMER = 'CUSTOMER',
}

export class DashboardSummaryQueryDto {
  @ApiPropertyOptional({
    required: false,
    enum: DashboardAnalyticsRange,
    default: DashboardAnalyticsRange.QUARTER,
  })
  @IsOptional()
  @IsEnum(DashboardAnalyticsRange)
  range: DashboardAnalyticsRange = DashboardAnalyticsRange.QUARTER;

  @ApiPropertyOptional({
    required: false,
    enum: DashboardSegmentBy,
    default: DashboardSegmentBy.WAREHOUSE_TYPE,
  })
  @IsOptional()
  @IsEnum(DashboardSegmentBy)
  segmentBy: DashboardSegmentBy = DashboardSegmentBy.WAREHOUSE_TYPE;

  @ApiPropertyOptional({
    required: false,
    type: Number,
    default: 2,
    description: '리턴율 목표선(%)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  targetReturnRate = 2;
}
