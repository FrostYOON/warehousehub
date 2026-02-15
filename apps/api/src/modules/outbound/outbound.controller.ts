import {
  Controller,
  Post,
  Body,
  Req,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';
import type { Request } from 'express';

import { OutboundService } from './outbound.service';
import { CreateOutboundOrderDto } from './dto/create-outbound-order.dto';

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
  list(@Req() req: Request) {
    return this.outbound.list(req.user!.companyId);
  }

  @Get(':id')
  detail(@Req() req: Request, @Param('id') id: string) {
    return this.outbound.detail(req.user!.companyId, id);
  }
}
