import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { AsnStatus } from '@prisma/client';

export class ListAsnQueryDto {
  @ApiPropertyOptional({ enum: AsnStatus })
  @IsOptional()
  @IsEnum(AsnStatus)
  status?: AsnStatus;

  @ApiPropertyOptional({ description: '도착 지사 ID' })
  @IsOptional()
  @IsUUID()
  toBranchId?: string;

  @ApiPropertyOptional({ description: '도착 창고 ID' })
  @IsOptional()
  @IsUUID()
  toWarehouseId?: string;
}
