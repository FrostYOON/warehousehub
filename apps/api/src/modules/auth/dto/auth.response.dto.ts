import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MeResponseDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'admin@warehousehub.local' })
  email!: string;

  @ApiProperty({ example: 'Admin' })
  name!: string;

  @ApiProperty({ example: 'ADMIN' })
  role!: string;

  @ApiProperty({ example: 'uuid' })
  companyId!: string;

  @ApiProperty({ example: 'WarehouseHub' })
  companyName!: string;

  @ApiPropertyOptional({ example: '1990-01-15', nullable: true })
  dateOfBirth?: string | null;

  @ApiPropertyOptional({ example: '+821012345678', nullable: true })
  phone?: string | null;

  @ApiPropertyOptional({ example: '서울시 강남구 테헤란로 123', nullable: true })
  addressLine1?: string | null;

  @ApiPropertyOptional({ example: '456호', nullable: true })
  addressLine2?: string | null;

  @ApiPropertyOptional({ example: '서울', nullable: true })
  city?: string | null;

  @ApiPropertyOptional({ example: '강남구', nullable: true })
  stateProvince?: string | null;

  @ApiPropertyOptional({ example: '06234', nullable: true })
  postalCode?: string | null;

  @ApiPropertyOptional({ example: 'KR', nullable: true })
  countryCode?: string | null;

  @ApiPropertyOptional({ example: 'https://s3.example.com/avatar.jpg', nullable: true })
  profileImageUrl?: string | null;
}

export class LoginResponseDto {
  @ApiProperty({ type: MeResponseDto })
  user!: MeResponseDto;
}

export class DeviceSessionDto {
  @ApiProperty({ example: 'session-id' })
  id!: string;

  @ApiProperty({ example: 'device-uuid', nullable: true })
  deviceId!: string | null;

  @ApiProperty({ example: 'Web (MacIntel)', nullable: true })
  deviceName!: string | null;

  @ApiProperty({ example: 'Mozilla/5.0 ...', nullable: true })
  userAgent!: string | null;

  @ApiProperty({ example: '127.0.0.1', nullable: true })
  ip!: string | null;

  @ApiProperty({ example: '2026-02-24T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-03-25T12:00:00.000Z' })
  expiresAt!: Date;

  @ApiProperty({ example: true })
  isCurrent!: boolean;
}

export class DeviceSessionsResponseDto {
  @ApiProperty({ example: 3 })
  maxActiveDevices!: number;

  @ApiProperty({ type: DeviceSessionDto, isArray: true })
  devices!: DeviceSessionDto[];
}

export class OkResponseDto {
  @ApiProperty({ example: true })
  ok!: boolean;
}

export class LogoutOthersResponseDto extends OkResponseDto {
  @ApiProperty({ example: 2 })
  revokedCount!: number;
}

export class LoginCompanyDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'WarehouseHub' })
  name!: string;
}

export class LoginCompaniesResponseDto {
  @ApiProperty({ type: LoginCompanyDto, isArray: true })
  companies!: LoginCompanyDto[];
}
