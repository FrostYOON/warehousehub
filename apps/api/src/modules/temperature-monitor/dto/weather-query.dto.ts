import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class WeatherQueryDto {
  @ApiPropertyOptional({
    required: false,
    description: '위도 (-90 ~ 90). 미입력 시 회사 주소 또는 기본값 사용',
    example: 37.5665,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({
    required: false,
    description: '경도 (-180 ~ 180). 미입력 시 회사 주소 또는 기본값 사용',
    example: 126.978,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;
}
