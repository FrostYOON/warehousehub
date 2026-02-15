import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  customerName!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  customerAddress!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  country?: string;

  // lat/lng는 지금은 입력 안 받고, 나중에 지도 연동하면서 자동 계산해도 됨
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lat?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lng?: string;
}
