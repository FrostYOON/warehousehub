import { IsArray, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AddStocktakingLineDto {
  @IsUUID()
  lotId: string;
}

export class AddLinesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddStocktakingLineDto)
  lines: AddStocktakingLineDto[];
}
