import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateItemDto {
  @ApiPropertyOptional({ description: '품목 코드 (회사 내 유니크)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  itemCode?: string;

  @ApiPropertyOptional({ description: '품목명' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  itemName?: string;

  @ApiPropertyOptional({ description: '품목 기본 원가' })
  @IsOptional()
  @IsNumber()
  unitCost?: number;
}
