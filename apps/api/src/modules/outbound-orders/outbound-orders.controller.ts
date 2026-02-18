import {
  Controller,
  Post,
  Body,
  Req,
  Get,
  Param,
  UseGuards,
  Patch,
  Delete,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';
import type { Request } from 'express';

import { OutboundOrdersService } from './outbound-orders.service';
import { CreateOutboundOrderDto } from './dto/create-outbound-order.dto';
import { UpdateOutboundLineDto } from './dto/update-outbound-line.dto';

@ApiTags('Outbound Orders')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('outbound/orders')
export class OutboundOrdersController {
  constructor(private readonly orders: OutboundOrdersService) {}

  @Post()
  @Roles(Role.ADMIN, Role.WH_MANAGER, Role.SALES)
  create(@Req() req: Request, @Body() dto: CreateOutboundOrderDto) {
    return this.orders.create(req.user!.companyId, req.user!.userId, dto);
  }

  @Get()
  list(@Req() req: Request) {
    return this.orders.list(req.user!.companyId);
  }

  @Get(':id')
  detail(@Req() req: Request, @Param('id') id: string) {
    return this.orders.detail(req.user!.companyId, id);
  }

  @Patch(':orderId/lines/:lineId/cancel')
  @Roles(Role.ADMIN, Role.WH_MANAGER, Role.SALES)
  cancelLine(
    @Req() req: Request,
    @Param('orderId') orderId: string,
    @Param('lineId') lineId: string,
  ) {
    return this.orders.cancelLine(
      req.user!.companyId,
      req.user!.userId,
      orderId,
      lineId,
    );
  }

  @Patch(':orderId/lines/:lineId')
  @Roles(Role.ADMIN, Role.WH_MANAGER, Role.SALES)
  updateLine(
    @Req() req: Request,
    @Param('orderId') orderId: string,
    @Param('lineId') lineId: string,
    @Body() dto: UpdateOutboundLineDto,
  ) {
    if (dto.requestedQty === undefined || dto.requestedQty < 0) {
      throw new BadRequestException('requestedQty must be greater than 0');
    }
    return this.orders.updateLine(
      req.user!.companyId,
      req.user!.userId,
      orderId,
      lineId,
      dto.requestedQty,
    );
  }
}
