import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsUUID,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

export class BulkRoleDto {
  @ApiProperty({ type: [String], example: ['uuid1', 'uuid2'] })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  userIds!: string[];

  @ApiProperty({ enum: Role, example: Role.SALES })
  @IsEnum(Role)
  role!: Role;
}
