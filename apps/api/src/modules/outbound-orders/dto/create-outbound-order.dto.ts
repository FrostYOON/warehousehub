import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsString,
  IsUUID,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateOutboundLineDto {
  @ApiProperty()
  @IsUUID()
  itemId!: string;

  @ApiProperty()
  @IsNumber(
    { maxDecimalPlaces: 3 },
    { message: 'requestedQty must have up to 3 decimal places' },
  )
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

  @ApiPropertyOptional()
  @IsString()
  memo?: string;

  @ApiProperty({ type: [CreateOutboundLineDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateOutboundLineDto)
  lines!: CreateOutboundLineDto[];
}
