import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateUserDepartmentDto {
  @ApiPropertyOptional({
    example: 'SALES',
    description: '부서 코드 (SALES, ACCOUNTING, WAREHOUSE, DELIVERY 등)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  departmentCode?: string | null;

  @ApiPropertyOptional({
    example: 'uuid',
    description: '상위 관리자 User ID (null 시 제거)',
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  supervisorId?: string | null;

  @ApiPropertyOptional({
    example: ['uuid1', 'uuid2'],
    description: '담당 지사 Branch ID 배열 (비어있으면 전체 지사 접근)',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  branchIds?: string[];
}
