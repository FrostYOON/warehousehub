import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTemperatureLogDto {
  @ApiPropertyOptional({ description: '조회 위치 위도 (날씨 API용)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  locationLat?: number;

  @ApiPropertyOptional({ description: '조회 위치 경도 (날씨 API용)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  locationLng?: number;

  @ApiPropertyOptional({ description: '외부 날씨 온도 (°C)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-50)
  @Max(50)
  weatherTemp?: number;

  @ApiPropertyOptional({ description: '냉장(COOL) 측정 온도 (°C), 적정: 2~8' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-50)
  @Max(50)
  coolTemp?: number;

  @ApiPropertyOptional({ description: '냉동(FRZ) 측정 온도 (°C), 적정: -18 이하' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-50)
  @Max(50)
  frzTemp?: number;

  @ApiPropertyOptional({ description: '메모' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  memo?: string;
}
