import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class ProcessReturnReceiptDto {
  @ApiProperty({ description: '처리(재고반영)할 라인 id 목록', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  lineIds!: string[];
}
