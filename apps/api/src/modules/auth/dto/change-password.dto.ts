import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsStrongPassword } from 'class-validator';

/** 비밀번호 규칙: 8자 이상, 소문자·대문자·숫자·특수문자 각 1자 이상 */
const PASSWORD_OPTIONS = {
  minLength: 8,
  minLowercase: 1,
  minUppercase: 1,
  minNumbers: 1,
  minSymbols: 1,
} as const;

export class ChangePasswordDto {
  @ApiProperty({ example: 'currentSecret123', description: '현재 비밀번호' })
  @IsString()
  @IsNotEmpty({ message: '현재 비밀번호를 입력해주세요' })
  currentPassword!: string;

  @ApiProperty({
    example: 'NewSecret456!',
    description: '새 비밀번호 (8자 이상, 소문자·대문자·숫자·특수문자 각 1자 이상)',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: '새 비밀번호를 입력해주세요' })
  @IsStrongPassword(
    PASSWORD_OPTIONS,
    {
      message:
        '새 비밀번호는 8자 이상이며, 소문자·대문자·숫자·특수문자(@$!%*?&#)를 각각 1자 이상 포함해야 합니다',
    },
  )
  newPassword!: string;
}
