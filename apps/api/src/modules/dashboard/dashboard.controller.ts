import {
  Body,
  Controller,
  Get,
  Header,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
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
import {
  DashboardPrefsResponseDto,
  UpdateDashboardPrefsDto,
} from './dto/dashboard-prefs.dto';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('prefs')
  @Roles(
    Role.ADMIN,
    Role.WH_MANAGER,
    Role.DELIVERY,
    Role.ACCOUNTING,
    Role.SALES,
  )
  getPrefs(@Req() req: Request) {
    return this.dashboard.getPrefs(req.user!.userId);
  }

  @Patch('prefs')
  @Roles(
    Role.ADMIN,
    Role.WH_MANAGER,
    Role.DELIVERY,
    Role.ACCOUNTING,
    Role.SALES,
  )
  savePrefs(@Req() req: Request, @Body() dto: UpdateDashboardPrefsDto) {
    return this.dashboard.savePrefs(req.user!.userId, dto);
  }

  @Get('summary')
  @Header('Cache-Control', 'private, max-age=15')
  @ApiQuery({ name: 'range', required: false, enum: DashboardAnalyticsRange })
  @ApiQuery({ name: 'segmentBy', required: false, enum: DashboardSegmentBy })
  @ApiQuery({
    name: 'targetReturnRate',
    required: false,
    type: Number,
    example: 2,
  })
  @Roles(
    Role.ADMIN,
    Role.WH_MANAGER,
    Role.DELIVERY,
    Role.ACCOUNTING,
    Role.SALES,
  )
  summary(@Req() req: Request, @Query() query: DashboardSummaryQueryDto) {
    return this.dashboard.summary(
      req.user!.companyId,
      req.user!.role,
      query.range,
      query.segmentBy,
      query.targetReturnRate,
    );
  }
}
