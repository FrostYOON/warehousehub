import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { InboundUploadStatus } from '@prisma/client';

export class InboundUploadsQueryDto {
  @ApiPropertyOptional({ enum: InboundUploadStatus, required: false })
  @IsOptional()
  @IsEnum(InboundUploadStatus)
  status?: InboundUploadStatus;

  @ApiPropertyOptional({ example: 'inbound', required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ example: 1, required: false, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, required: false, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

export class InboundUploadDetailQueryDto {
  @ApiPropertyOptional({ example: 1, required: false, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rowPage?: number = 1;

  @ApiPropertyOptional({ example: 50, required: false, minimum: 1, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  rowPageSize?: number = 50;
}
