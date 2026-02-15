import { IsOptional, IsEnum, IsString } from 'class-validator';
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
}
