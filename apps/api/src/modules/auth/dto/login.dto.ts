import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsStrongPassword } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'Email', example: 'test@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Password', example: 'password' })
  @IsString()
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  password!: string;

  @ApiProperty({ example: 'WarehouseHub' })
  @IsString()
  companyName!: string;

  @ApiProperty({ example: 'device-uuid-1234', required: false })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({ example: 'MacBook Pro', required: false })
  @IsOptional()
  @IsString()
  deviceName?: string;
}
