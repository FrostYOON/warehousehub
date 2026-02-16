import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateOutboundLineDto {
  @ApiPropertyOptional({ description: '요청 수량' })
  @IsOptional()
  @IsInt()
  @Min(0)
  requestedQty?: number;
}
