import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsStrongPassword } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'WarehouseHub' })
  @IsString()
  companyName!: string;

  @ApiProperty({ example: 'admin@warehousehub.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Admin' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'Admin1234!' })
  @IsString()
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  password!: string;
}
