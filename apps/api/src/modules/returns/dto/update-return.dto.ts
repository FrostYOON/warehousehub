import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StorageType } from '@prisma/client';

export class UpdateReturnLineDto {
  @ApiPropertyOptional({ description: '기존 라인 수정/삭제 시 라인 ID' })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiPropertyOptional({ description: 'true면 해당 라인 삭제' })
  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean;

  @ApiPropertyOptional({ description: '상품 변경/신규 라인 생성 시 itemId' })
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @ApiPropertyOptional({ enum: StorageType })
  @IsOptional()
  @IsEnum(StorageType)
  storageType?: StorageType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 3 },
    { message: 'qty must have up to 3 decimal places' },
  )
  @Min(1)
  qty?: number;

  @ApiPropertyOptional({
    description: '유통기한 (없으면 null)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ description: '유통기한 제거 시 true' })
  @IsOptional()
  @IsBoolean()
  clearExpiryDate?: boolean;
}

export class UpdateReturnReceiptDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ example: '2026-02-20' })
  @IsOptional()
  @IsDateString()
  receivedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  memo?: string;

  // 라인 수정/추가/삭제를 모두 지원
  @ApiPropertyOptional({ type: [UpdateReturnLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateReturnLineDto)
  lines?: UpdateReturnLineDto[];
}
