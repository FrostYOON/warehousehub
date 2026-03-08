import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class DashboardPrefsResponseDto {
  @ApiProperty({ example: ['alerts', 'todos', 'analysis', 'inventory'] })
  widgetOrder!: string[];

  @ApiProperty({
    example: { alerts: true, todos: true, analysis: true, inventory: true },
  })
  widgetVisibility!: Record<string, boolean>;

  @ApiProperty({
    example: { alerts: false, todos: false, analysis: false, inventory: false },
  })
  widgetCollapsed!: Record<string, boolean>;
}

export class UpdateDashboardPrefsDto {
  @ApiPropertyOptional({ example: ['alerts', 'todos', 'analysis', 'inventory'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  widgetOrder?: string[];

  @ApiPropertyOptional({
    example: { alerts: true, todos: false },
  })
  @IsOptional()
  @IsObject()
  widgetVisibility?: Record<string, boolean>;

  @ApiPropertyOptional({
    example: { alerts: false, analysis: true },
  })
  @IsOptional()
  @IsObject()
  widgetCollapsed?: Record<string, boolean>;
}
