import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateStocktakingDto {
  @IsUUID()
  warehouseId: string;

  @IsOptional()
  @IsString()
  memo?: string;
}
