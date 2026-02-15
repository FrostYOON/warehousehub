import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateRoleDto {
  @ApiProperty({ enum: Role, example: Role.SALES })
  @IsEnum(Role)
  role!: Role;
}
