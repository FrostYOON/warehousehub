import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class UpdateOutboundLineDto {
  @ApiPropertyOptional({ description: '요청 수량' })
  @IsNumber(
    { maxDecimalPlaces: 3 },
    { message: 'requestedQty must have up to 3 decimal places' },
  )
  @Min(0)
  requestedQty!: number;
}
