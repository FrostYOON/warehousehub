import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateItemDto {
  @ApiProperty({ description: '품목 코드 (회사 내 유니크)' })
  @IsString()
  @MaxLength(50)
  itemCode!: string;

  @ApiProperty({ description: '품목명' })
  @IsString()
  @MaxLength(200)
  itemName!: string;
}
