import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsString,
  IsStrongPassword,
  NotEquals,
} from 'class-validator';

export class SignupRequestDto {
  @ApiProperty({ example: 'WarehouseHub' })
  @IsString()
  companyName!: string;

  @ApiProperty({ example: 'staff1@warehousehub.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Staff One' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'Staff1234!' })
  @IsString()
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  password!: string;

  @ApiProperty({ enum: Role, example: Role.SALES })
  @IsEnum(Role)
  @NotEquals(Role.ADMIN)
  role!: Role;
}
