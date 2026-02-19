import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class UpdateReturnLineDto {
  @ApiPropertyOptional()
  @IsUUID()
  id!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  qty?: number;

  @ApiPropertyOptional({
    description: '유통기한 (없으면 null)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storageType?: any; // StorageType은 변경 안 받을 거면 제거해도 됨
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

  // 라인 qty/expiryDate 수정용 (라인 추가/삭제는 다음 단계에서 확장)
  @ApiPropertyOptional({ type: [UpdateReturnLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateReturnLineDto)
  lines?: UpdateReturnLineDto[];
}
