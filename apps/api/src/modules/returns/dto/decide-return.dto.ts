import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ReturnLineDecision } from '@prisma/client';

class DecideLineDto {
  @ApiProperty()
  @IsUUID()
  lineId!: string;

  @ApiProperty({ enum: ReturnLineDecision })
  @IsEnum(ReturnLineDecision)
  decision!: ReturnLineDecision;
}

export class DecideReturnReceiptDto {
  @ApiProperty({ type: [DecideLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DecideLineDto)
  lines!: DecideLineDto[];
}
