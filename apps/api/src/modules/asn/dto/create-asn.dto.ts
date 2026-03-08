import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAsnLineDto {
  @ApiProperty({ description: '품목 ID' })
  @IsUUID()
  itemId!: string;

  @ApiProperty({ description: '예정 수량', minimum: 0.001 })
  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @ApiPropertyOptional({ description: '유통기한 (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

export class CreateAsnDto {
  @ApiPropertyOptional({ description: '출발 지사 ID (내부 이동 시)' })
  @IsOptional()
  @IsUUID()
  fromBranchId?: string;

  @ApiPropertyOptional({ description: '출발 창고 ID' })
  @IsOptional()
  @IsUUID()
  fromWarehouseId?: string;

  @ApiProperty({ description: '도착 지사 ID' })
  @IsUUID()
  toBranchId!: string;

  @ApiProperty({ description: '도착 창고 ID' })
  @IsUUID()
  toWarehouseId!: string;

  @ApiProperty({ description: '예정 입고일 (ISO 8601)' })
  @IsDateString()
  expectedDate!: string;

  @ApiProperty({
    type: [CreateAsnLineDto],
    description: '입고 예정 라인',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAsnLineDto)
  lines!: CreateAsnLineDto[];
}
