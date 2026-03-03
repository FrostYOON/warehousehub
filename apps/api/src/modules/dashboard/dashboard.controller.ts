import { Controller, Get, Header, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DashboardService } from './dashboard.service';
import {
  DashboardAnalyticsRange,
  DashboardSegmentBy,
  DashboardSummaryQueryDto,
} from './dto/dashboard-summary-query.dto';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  @Header('Cache-Control', 'private, max-age=15')
  @ApiQuery({ name: 'range', required: false, enum: DashboardAnalyticsRange })
  @ApiQuery({ name: 'segmentBy', required: false, enum: DashboardSegmentBy })
  @ApiQuery({ name: 'targetReturnRate', required: false, type: Number, example: 2 })
  @Roles(Role.ADMIN, Role.WH_MANAGER, Role.DELIVERY, Role.ACCOUNTING, Role.SALES)
  summary(@Req() req: Request, @Query() query: DashboardSummaryQueryDto) {
    return this.dashboard.summary(
      req.user!.companyId,
      req.user!.role as Role,
      query.range,
      query.segmentBy,
      query.targetReturnRate,
    );
  }
}
