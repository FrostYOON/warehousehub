import { IsNumber, Min } from 'class-validator';

export class UpdateLineActualQtyDto {
  @IsNumber()
  @Min(0)
  actualQty: number;
}
