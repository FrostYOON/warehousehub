import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

function toInt(value: unknown, def: number): number {
  if (value === undefined || value === null || value === '') return def;
  const n = parseInt(String(value), 10);
  return Number.isNaN(n) ? def : n;
}

export class ListAuditLogsQueryDto {
  @ApiPropertyOptional({ description: '액션 필터 (ROLE_CHANGED, ACTIVATED, DEACTIVATED 등)' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: '대상 사용자 ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: '실행자 사용자 ID' })
  @IsOptional()
  @IsString()
  actorUserId?: string;

  @ApiPropertyOptional({ description: '시작일 (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: '종료일 (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ description: '페이지 번호', default: 1, minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => toInt(value, 1))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '페이지당 항목 수', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => toInt(value, 20))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
