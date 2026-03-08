import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'user@example.com',
    description: '가입 시 사용한 이메일',
  })
  @IsString()
  @IsNotEmpty({ message: '이메일을 입력해주세요' })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다' })
  email!: string;

  @ApiProperty({
    example: 'Acme Corp',
    description: '소속 회사명 (로그인 시 선택하는 회사)',
  })
  @IsString()
  @IsNotEmpty({ message: '회사명을 입력해주세요' })
  companyName!: string;
}
