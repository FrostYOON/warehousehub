import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateCompanyBrandingDto {
  @ApiPropertyOptional({
    example: 'https://example.com/logo.png',
    description: '로고 이미지 URL',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsUrl()
  @MaxLength(2048)
  logoUrl?: string | null;

  @ApiPropertyOptional({
    example: '#2563eb',
    description: '브랜드 주 색상 (CSS 색상 값)',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsString()
  @MaxLength(50)
  brandPrimaryColor?: string | null;
}
