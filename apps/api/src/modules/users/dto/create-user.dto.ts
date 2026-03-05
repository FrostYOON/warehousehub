import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsString, IsStrongPassword } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'staff1@warehousehub.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'User Name' })
  @IsString()
  name!: string;

  @ApiProperty({
    example: 'User1234!',
    description: '8자 이상, 소문자·대문자·숫자·특수문자 각 1자 이상',
  })
  @IsString()
  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        '비밀번호는 8자 이상이며, 소문자·대문자·숫자·특수문자(@$!%*?&#)를 각각 1자 이상 포함해야 합니다',
    },
  )
  password!: string;

  @ApiProperty({ enum: Role, example: Role.DELIVERY })
  @IsEnum(Role)
  role!: Role;
}
