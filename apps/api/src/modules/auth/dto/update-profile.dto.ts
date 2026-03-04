import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsDateString,
  Matches,
  IsUrl,
  ValidateIf,
} from 'class-validator';

/** E.164 휴대폰 번호 정규식: +[country][number] */
const E164_PHONE_REGEX = /^\+[1-9]\d{6,14}$/;

/** ISO 3166-1 alpha-2 국가코드 (2자) */
const COUNTRY_CODE_REGEX = /^[A-Z]{2}$/;

function emptyToNull(v: unknown): string | null | undefined {
  if (v === undefined) return undefined; // 필드 미전송 → 업데이트 스킵
  if (v === null || v === '') return null; // 명시적 삭제
  const s = String(v).trim();
  return s || null;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: '홍길동', description: '표시 이름' })
  @IsString()
  @IsNotEmpty({ message: '이름을 입력해주세요' })
  @MinLength(1, { message: '이름은 1자 이상이어야 합니다' })
  @MaxLength(100, { message: '이름은 100자 이하여야 합니다' })
  name!: string;

  @ApiPropertyOptional({ example: '1990-01-15', description: '생년월일 (YYYY-MM-DD)' })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : value))
  @IsDateString({}, { message: '올바른 날짜 형식(YYYY-MM-DD)이어야 합니다' })
  dateOfBirth?: string | null;

  @ApiPropertyOptional({ example: '+821012345678', description: '휴대폰 번호 (E.164)' })
  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @ValidateIf((o) => o.phone != null && o.phone !== '')
  @IsString()
  @Matches(E164_PHONE_REGEX, {
    message: '휴대폰 번호는 E.164 형식(예: +821012345678)이어야 합니다',
  })
  phone?: string | null;

  @ApiPropertyOptional({ example: '서울시 강남구 테헤란로 123' })
  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(255)
  addressLine1?: string | null;

  @ApiPropertyOptional({ example: '456호' })
  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(255)
  addressLine2?: string | null;

  @ApiPropertyOptional({ example: '서울' })
  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(100)
  city?: string | null;

  @ApiPropertyOptional({ example: '강남구' })
  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(100)
  stateProvince?: string | null;

  @ApiPropertyOptional({ example: '06234' })
  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @ValidateIf((_, v) => v != null)
  @IsString()
  @MaxLength(20)
  postalCode?: string | null;

  @ApiPropertyOptional({ example: 'KR', description: 'ISO 3166-1 alpha-2 국가코드' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value?.toUpperCase?.() ?? value))
  @ValidateIf((o) => o.countryCode != null && o.countryCode !== '')
  @IsString()
  @Matches(COUNTRY_CODE_REGEX, {
    message: '국가코드는 2자리 영문 대문자(예: KR, US)여야 합니다',
  })
  countryCode?: string | null;

  @ApiPropertyOptional({ example: 'https://s3.example.com/profile/abc.jpg', description: '프로필 이미지 URL' })
  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @ValidateIf((o) => o.profileImageUrl != null && o.profileImageUrl !== '')
  @IsUrl({}, { message: '올바른 URL 형식이어야 합니다' })
  @MaxLength(2048)
  profileImageUrl?: string | null;
}
