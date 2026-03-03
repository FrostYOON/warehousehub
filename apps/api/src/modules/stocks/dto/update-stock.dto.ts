import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateStockDto {
  @ApiProperty({ example: 120.5, description: '수정할 현재고 수량' })
  @IsNumber()
  @Min(0)
  onHand!: number;

  @ApiProperty({ example: 10.25, description: '수정할 예약 수량' })
  @IsNumber()
  @Min(0)
  reserved!: number;

  @ApiPropertyOptional({ example: '실사 보정', description: '관리자 조정 메모' })
  @IsOptional()
  @IsString()
  memo?: string;
}
