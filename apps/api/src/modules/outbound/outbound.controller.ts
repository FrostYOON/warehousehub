import {
  Controller,
  Post,
  Body,
  Req,
  Get,
  Param,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';
import type { Request } from 'express';

import { OutboundService } from './outbound.service';
import { CreateOutboundOrderDto } from './dto/create-outbound-order.dto';
import { PickReserveDto } from './dto/pick-reserve.dto';

@ApiTags('Outbound')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('outbound/orders')
export class OutboundController {
  constructor(private readonly outbound: OutboundService) {}

  @Post()
  @Roles(Role.ADMIN, Role.WH_MANAGER)
  create(@Req() req: Request, @Body() dto: CreateOutboundOrderDto) {
    return this.outbound.create(req.user!.companyId, req.user!.userId, dto);
  }

  @Get()
  @Roles(
    Role.ADMIN,
    Role.WH_MANAGER,
    Role.DELIVERY,
    Role.ACCOUNTING,
    Role.SALES,
  )
  list(@Req() req: Request) {
    return this.outbound.list(req.user!.companyId);
  }

  @Get(':id')
  @Roles(
    Role.ADMIN,
    Role.WH_MANAGER,
    Role.DELIVERY,
    Role.ACCOUNTING,
    Role.SALES,
  )
  detail(@Req() req: Request, @Param('id') id: string) {
    return this.outbound.detail(req.user!.companyId, id);
  }

  @Patch(':orderId/lines/:lineId/cancel')
  @Roles(Role.ADMIN, Role.WH_MANAGER, Role.SALES)
  cancelLine(
    @Req() req: Request,
    @Param('orderId') orderId: string,
    @Param('lineId') lineId: string,
  ) {
    return this.outbound.cancelLine(
      req.user!.companyId,
      req.user!.userId,
      orderId,
      lineId,
    );
  }

  @Patch(':orderId/pick/reserve')
  @Roles(Role.ADMIN, Role.WH_MANAGER)
  reservePick(
    @Req() req: Request,
    @Param('orderId') orderId: string,
    @Body() dto: PickReserveDto,
  ) {
    return this.outbound.reservePick(
      req.user!.companyId,
      req.user!.userId,
      orderId,
      dto,
    );
  }

  @Post(':id/confirm')
  @Roles(Role.ADMIN, Role.WH_MANAGER)
  confirm(@Req() req: Request, @Param('id') id: string) {
    return this.outbound.confirm(req.user!.companyId, req.user!.userId, id);
  }
}
