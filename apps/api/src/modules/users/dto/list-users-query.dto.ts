import { ApiHideProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
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

export const SORT_BY_VALUES = [
  'name',
  'email',
  'createdAt',
  'updatedAt',
] as const;
export const SORT_ORDER_VALUES = ['asc', 'desc'] as const;
export type SortBy = (typeof SORT_BY_VALUES)[number];
export type SortOrder = (typeof SORT_ORDER_VALUES)[number];

export class ListUsersQueryDto {
  @ApiPropertyOptional({
    enum: Role,
    description: '역할로 필터',
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({
    type: Boolean,
    description: '활성화 여부로 필터 (true: 활성, false: 비활성/승인대기)',
  })
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: '페이지 번호 (1부터)',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => toInt(value, 1))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: '페이지당 항목 수',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => toInt(value, 20))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: '이름/이메일 검색 (대소문자 무시)',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: SORT_BY_VALUES,
    description: '정렬 기준',
  })
  @IsOptional()
  @IsIn(SORT_BY_VALUES)
  sortBy?: SortBy;

  @ApiPropertyOptional({
    enum: SORT_ORDER_VALUES,
    description: '정렬 방향',
  })
  @IsOptional()
  @IsIn(SORT_ORDER_VALUES)
  sortOrder?: SortOrder;

  /** 클라이언트 cache-busting용 (무시됨) */
  @ApiHideProperty()
  @IsOptional()
  @IsString()
  _?: string;
}
