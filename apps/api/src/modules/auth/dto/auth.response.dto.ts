import { ApiProperty } from '@nestjs/swagger';

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
}

export class LoginResponseDto {
  @ApiProperty({ type: MeResponseDto })
  user!: MeResponseDto;
}
