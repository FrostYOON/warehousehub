import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateOutboundLineDto {
  @ApiPropertyOptional({ description: '요청 수량' })
  @IsInt()
  @Min(0)
  requestedQty!: number;
}
