import {
  Controller,
  Post,
  Body,
  Req,
  Get,
  Param,
  UseGuards,
  Patch,
  BadRequestException,
  Header,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';
import type { Request, Response } from 'express';

type AuthedRequest = Request & {
  user: {
    companyId: string;
    userId: string;
    role: Role;
  };
};

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
  create(@Req() req: AuthedRequest, @Body() dto: CreateOutboundOrderDto) {
    return this.orders.create(req.user.companyId, req.user.userId, dto);
  }

  @Get()
  @Roles(
    Role.ADMIN,
    Role.WH_MANAGER,
    Role.DELIVERY,
    Role.ACCOUNTING,
    Role.SALES,
  )
  list(@Req() req: AuthedRequest) {
    return this.orders.list(req.user.companyId);
  }

  @Get('export')
  @Roles(
    Role.ADMIN,
    Role.WH_MANAGER,
    Role.DELIVERY,
    Role.ACCOUNTING,
    Role.SALES,
  )
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  async export(@Req() req: AuthedRequest, @Res() res: Response) {
    const file = await this.orders.exportOutbound(req.user.companyId);
    const fileName = `outbound-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(file);
  }

  @Get(':id')
  @Roles(
    Role.ADMIN,
    Role.WH_MANAGER,
    Role.DELIVERY,
    Role.ACCOUNTING,
    Role.SALES,
  )
  detail(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.orders.detail(req.user.companyId, id);
  }

  @Patch(':id/cancel')
  @Roles(Role.ADMIN, Role.SALES)
  cancelOrder(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    const reason = body?.reason;
    if (reason !== undefined) {
      if (typeof reason !== 'string' || reason.trim().length === 0) {
        throw new BadRequestException('reason must be a non-empty string');
      }
      if (reason.length > 500) {
        throw new BadRequestException('reason must be <= 500 chars');
      }
    }

    return this.orders.cancelOrder(
      req.user.companyId,
      req.user.userId,
      id,
      reason,
    );
  }

  @Patch(':orderId/lines/:lineId/cancel')
  @Roles(Role.ADMIN, Role.SALES)
  cancelLine(
    @Req() req: AuthedRequest,
    @Param('orderId') orderId: string,
    @Param('lineId') lineId: string,
  ) {
    return this.orders.cancelLine(
      req.user.companyId,
      req.user.userId,
      orderId,
      lineId,
    );
  }

  @Patch(':orderId/lines/:lineId')
  @Roles(Role.ADMIN, Role.SALES)
  updateLine(
    @Req() req: AuthedRequest,
    @Param('orderId') orderId: string,
    @Param('lineId') lineId: string,
    @Body() dto: UpdateOutboundLineDto,
  ) {
    if (
      dto.requestedQty === undefined ||
      !Number.isFinite(dto.requestedQty) ||
      !Number.isInteger(dto.requestedQty * 1000) ||
      dto.requestedQty < 1
    ) {
      throw new BadRequestException(
        'requestedQty must be >= 1 with up to 3 decimal places',
      );
    }
    return this.orders.updateLine(
      req.user.companyId,
      req.user.userId,
      orderId,
      lineId,
      dto.requestedQty,
    );
  }
}
