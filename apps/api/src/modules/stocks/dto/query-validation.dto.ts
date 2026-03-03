import { Type } from 'class-transformer';
import { IsOptional, IsEnum, IsString, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StorageType } from '@prisma/client';

export class StocksQueryDto {
  @ApiPropertyOptional({ enum: StorageType, required: false })
  @IsOptional()
  @IsEnum(StorageType)
  storageType?: StorageType = undefined;

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

  @ApiPropertyOptional({ example: 50, minimum: 1, maximum: 200, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number = 50;
}
