import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StorageType } from '@prisma/client';

class CreateReturnLineDto {
  @ApiProperty()
  @IsUUID()
  itemId!: string;

  @ApiProperty({ enum: StorageType })
  @IsEnum(StorageType)
  storageType!: StorageType;

  @ApiPropertyOptional({
    description: '유통기한 (없으면 null)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  qty!: number;
}

export class CreateReturnReceiptDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({
    description: '접수일(기본 now)',
    example: '2026-02-20',
  })
  @IsOptional()
  @IsDateString()
  receivedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  memo?: string;

  @ApiProperty({ type: [CreateReturnLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReturnLineDto)
  lines!: CreateReturnLineDto[];
}
