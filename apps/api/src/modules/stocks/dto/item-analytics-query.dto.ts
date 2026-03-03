import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum ItemAnalyticsRange {
  WEEK = 'WEEK',
  QUARTER = 'QUARTER',
  HALF = 'HALF',
  YEAR = 'YEAR',
}

export class StockItemsQueryDto {
  @ApiPropertyOptional({ required: false, example: 'A00' })
  @IsOptional()
  @IsString()
  keyword?: string = undefined;
}

export class ItemTrendQueryDto {
  @ApiPropertyOptional({ required: false, enum: ItemAnalyticsRange, default: ItemAnalyticsRange.WEEK })
  @IsOptional()
  @IsEnum(ItemAnalyticsRange)
  range: ItemAnalyticsRange = ItemAnalyticsRange.WEEK;
}
