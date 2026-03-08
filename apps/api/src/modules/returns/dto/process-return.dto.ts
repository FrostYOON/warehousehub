import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class ProcessReturnReceiptDto {
  @ApiProperty({ description: '처리(재고반영)할 라인 id 목록', type: [String] })
  @IsArray()
  @ArrayMinSize(1, { message: 'lineIds는 최소 1개 이상이어야 합니다.' })
  @IsUUID('4', { each: true })
  lineIds!: string[];
}
