import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiPropertyOptional({ example: 1, description: 'page number (1-based)' })
  page?: number;

  @ApiPropertyOptional({ example: 20, description: 'page size' })
  size?: number;
}
