import { Type } from 'class-transformer';
import {
  IsOptional,
  IsEnum,
  IsString,
  IsInt,
  Min,
  Max,
  IsIn,
  IsUUID,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StorageType } from '@prisma/client';

export const EXPIRY_SOON_DAYS = [7, 14, 30, 60, 90] as const;
export type ExpirySoonDays = (typeof EXPIRY_SOON_DAYS)[number];

export class StocksQueryDto {
  @ApiPropertyOptional({ enum: StorageType, required: false })
  @IsOptional()
  @IsEnum(StorageType)
  storageType?: StorageType = undefined;

  @ApiPropertyOptional({ description: '창고 ID (재고 실사 등)', required: false })
  @IsOptional()
  @IsUUID()
  warehouseId?: string = undefined;

  @ApiPropertyOptional({
    description: '유통기한 N일 이내 필터 (7, 14, 30, 60, 90)',
    enum: [7, 14, 30, 60, 90],
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([7, 14, 30, 60, 90])
  expirySoon?: ExpirySoonDays = undefined;

  @ApiPropertyOptional({ example: 'A001', type: String, required: false })
  @IsOptional()
  @IsString()
  itemCode?: string = undefined;

  @ApiPropertyOptional({ example: 1, minimum: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 50,
    minimum: 1,
    maximum: 500,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  pageSize?: number = 50;
}
