import { IsOptional, IsIn, IsUUID, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ListStocktakingQueryDto {
  @IsOptional()
  @IsIn(['DRAFT', 'IN_PROGRESS', 'CONFIRMED', 'CANCELLED'])
  status?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
