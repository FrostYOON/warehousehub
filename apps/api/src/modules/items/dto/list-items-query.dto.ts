import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

function toBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  const s = String(value).toLowerCase();
  if (s === 'true') return true;
  if (s === 'false') return false;
  return undefined;
}

function toInt(value: unknown, def: number): number {
  if (value === undefined || value === null || value === '') return def;
  const n = parseInt(String(value), 10);
  return Number.isNaN(n) ? def : n;
}

export class ListItemsQueryDto {
  @ApiPropertyOptional({ description: '검색어 (품목 코드·품목명)' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description: '비활성 포함 여부 (true면 전체 조회)',
  })
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  includeInactive?: boolean;

  @ApiPropertyOptional({
    type: Boolean,
    description: '활성 여부로 필터 (true: 활성, false: 비활성)',
  })
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '페이지 번호 (1부터)', default: 1 })
  @IsOptional()
  @Transform(({ value }) => toInt(value, 1))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: '페이지당 항목 수 (기본 500, 드롭다운 등에서 전체 조회)',
    default: 500,
  })
  @IsOptional()
  @Transform(({ value }) => toInt(value, 500))
  @IsInt()
  @Min(1)
  @Max(500)
  pageSize?: number = 500;
}
