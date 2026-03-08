import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTransferLineDto {
  @ApiProperty({ description: 'Lot ID' })
  @IsUUID()
  lotId!: string;

  @ApiProperty({ description: '이동 수량', minimum: 0.001 })
  @IsNumber()
  @Min(0.001)
  qty!: number;
}

export class CreateTransferDto {
  @ApiProperty({ description: '출발 창고 ID' })
  @IsUUID()
  fromWarehouseId!: string;

  @ApiProperty({ description: '도착 창고 ID' })
  @IsUUID()
  toWarehouseId!: string;

  @ApiPropertyOptional({ description: '메모' })
  @IsOptional()
  @IsString()
  memo?: string;

  @ApiProperty({
    type: [CreateTransferLineDto],
    description: 'Lot 단위 이동 라인',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTransferLineDto)
  lines!: CreateTransferLineDto[];
}
