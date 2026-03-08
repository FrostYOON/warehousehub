import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { InventoryForecastService } from './inventory-forecast.service';

@ApiTags('InventoryForecast')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('inventory-forecast')
export class InventoryForecastController {
  constructor(private readonly service: InventoryForecastService) {}

  @Get('demand')
  @ApiQuery({ name: 'lookbackDays', required: false, type: Number, description: '분석 기간(일), 기본 30' })
  @ApiQuery({ name: 'forecastDays', required: false, type: Number, description: '예측 기간(일), 기본 7' })
  @ApiQuery({ name: 'itemId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @Roles(Role.ADMIN, Role.WH_MANAGER, Role.ACCOUNTING, Role.SALES)
  getDemandForecast(
    @Req() req: Request,
    @Query('lookbackDays') lookbackDays?: string,
    @Query('forecastDays') forecastDays?: string,
    @Query('itemId') itemId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.getDemandForecast(req.user!.companyId, {
      lookbackDays: lookbackDays ? parseInt(lookbackDays, 10) : undefined,
      forecastDays: forecastDays ? parseInt(forecastDays, 10) : undefined,
      itemId: itemId || undefined,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get('reorder-suggestions')
  @ApiQuery({ name: 'lookbackDays', required: false, type: Number, description: '출고 분석 기간(일), 기본 30' })
  @ApiQuery({ name: 'leadTimeDays', required: false, type: Number, description: '리드타임(일), 기본 7' })
  @ApiQuery({ name: 'safetyStock', required: false, type: Number, description: '안전재고, 기본 0' })
  @ApiQuery({ name: 'itemId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @Roles(Role.ADMIN, Role.WH_MANAGER, Role.ACCOUNTING, Role.SALES)
  getReorderSuggestions(
    @Req() req: Request,
    @Query('lookbackDays') lookbackDays?: string,
    @Query('leadTimeDays') leadTimeDays?: string,
    @Query('safetyStock') safetyStock?: string,
    @Query('itemId') itemId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.getReorderSuggestions(req.user!.companyId, {
      lookbackDays: lookbackDays ? parseInt(lookbackDays, 10) : undefined,
      leadTimeDays: leadTimeDays ? parseInt(leadTimeDays, 10) : undefined,
      safetyStock: safetyStock ? parseFloat(safetyStock) : undefined,
      itemId: itemId || undefined,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }
}
