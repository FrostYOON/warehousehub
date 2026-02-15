import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'staff1@warehousehub.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'User Name' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'User1234!' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ enum: Role, example: Role.DELIVERY })
  @IsEnum(Role)
  role!: Role;
}
