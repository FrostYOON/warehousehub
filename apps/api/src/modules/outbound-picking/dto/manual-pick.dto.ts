import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsUUID, Min } from 'class-validator';

export class ManualPickDto {
  @ApiProperty()
  @IsUUID()
  outboundLineId!: string;

  @ApiProperty()
  @IsUUID()
  warehouseId!: string;

  @ApiProperty()
  @IsUUID()
  lotId!: string;

  @ApiProperty()
  @IsNumber(
    { maxDecimalPlaces: 3 },
    { message: 'qty must have up to 3 decimal places' },
  )
  @Min(1)
  qty!: number;
}
