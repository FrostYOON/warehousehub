import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsString,
  IsUUID,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateOutboundLineDto {
  @ApiProperty()
  @IsUUID()
  itemId!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  requestedQty!: number;
}

export class CreateOutboundOrderDto {
  @ApiProperty()
  @IsUUID()
  customerId!: string;

  @ApiProperty({ description: 'YYYY-MM-DD 형식' })
  @IsDateString()
  plannedDate!: string;

  @ApiProperty({ required: false })
  @IsString()
  memo?: string;

  @ApiProperty({ type: [CreateOutboundLineDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateOutboundLineDto)
  lines!: CreateOutboundLineDto[];
}
