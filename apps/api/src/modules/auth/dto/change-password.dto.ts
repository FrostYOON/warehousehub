import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'currentSecret123', description: '현재 비밀번호' })
  @IsString()
  @IsNotEmpty({ message: '현재 비밀번호를 입력해주세요' })
  currentPassword!: string;

  @ApiProperty({ example: 'newSecret456', description: '새 비밀번호', minLength: 8 })
  @IsString()
  @IsNotEmpty({ message: '새 비밀번호를 입력해주세요' })
  @MinLength(8, { message: '새 비밀번호는 8자 이상이어야 합니다' })
  newPassword!: string;
}
