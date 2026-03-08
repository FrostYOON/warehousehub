import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBranchDto {
  @ApiProperty({ description: '지사명' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ description: '지사 코드 (TOR, MTL 등)' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string;
}
