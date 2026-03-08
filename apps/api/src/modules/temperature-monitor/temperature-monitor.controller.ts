import {
  Body,
  Controller,
  Get,
  Header,
  Post,
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
import { TemperatureMonitorService } from './temperature-monitor.service';
import { CreateTemperatureLogDto } from './dto/create-temperature-log.dto';
import {
  TemperatureStatsGroupBy,
  TemperatureStatsQueryDto,
} from './dto/temperature-stats-query.dto';
import { WeatherQueryDto } from './dto/weather-query.dto';
import { ListTemperatureLogsQueryDto } from './dto/list-logs-query.dto';

@ApiTags('Temperature Monitor')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('temperature-monitor')
export class TemperatureMonitorController {
  constructor(private readonly monitor: TemperatureMonitorService) {}

  @Get('today-recorded')
  @Roles(Role.ADMIN, Role.WH_MANAGER)
  getTodayRecorded(@Req() req: Request) {
    return this.monitor.getTodayRecordedStatus(req.user!.companyId);
  }

  @Get('weather')
  @Roles(
    Role.ADMIN,
    Role.WH_MANAGER,
    Role.DELIVERY,
    Role.ACCOUNTING,
    Role.SALES,
  )
  getWeather(@Req() req: Request, @Query() query: WeatherQueryDto) {
    return this.monitor.fetchWeather(
      req.user!.companyId,
      query.lat,
      query.lng,
    );
  }

  @Post('logs')
  @Roles(Role.ADMIN, Role.WH_MANAGER)
  createLog(@Req() req: Request, @Body() dto: CreateTemperatureLogDto) {
    return this.monitor.createLog(
      req.user!.companyId,
      req.user!.userId,
      dto,
    );
  }

  @Get('logs')
  @Roles(Role.ADMIN, Role.WH_MANAGER)
  listLogs(@Req() req: Request, @Query() query: ListTemperatureLogsQueryDto) {
    return this.monitor.listLogs(req.user!.companyId, {
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Get('stats')
  @Header('Cache-Control', 'private, max-age=60')
  @ApiQuery({ name: 'from', required: true, example: '2025-03-01' })
  @ApiQuery({ name: 'to', required: true, example: '2025-03-05' })
  @ApiQuery({ name: 'groupBy', required: false, enum: TemperatureStatsGroupBy })
  @Roles(Role.ADMIN, Role.WH_MANAGER)
  getStats(@Req() req: Request, @Query() query: TemperatureStatsQueryDto) {
    return this.monitor.getStats(req.user!.companyId, query);
  }
}
