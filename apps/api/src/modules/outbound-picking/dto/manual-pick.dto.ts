import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

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
  @IsInt()
  @Min(1)
  qty!: number;
}
