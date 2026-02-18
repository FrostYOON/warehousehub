import { Controller, Post, Param, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { OutboundShippingService } from './outbound-shipping.service';

@ApiTags('Outbound Shipping')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('outbound/orders')
export class OutboundShippingController {
  constructor(private readonly shipping: OutboundShippingService) {}

  @Post(':id/ship/verify')
  @Roles(Role.ADMIN, Role.WH_MANAGER, Role.DELIVERY)
  verify(@Req() req: Request, @Param('id') id: string) {
    return this.shipping.verify(req.user!.companyId, req.user!.userId, id);
  }

  @Post(':id/ship/start')
  @Roles(Role.ADMIN, Role.DELIVERY)
  start(@Req() req: Request, @Param('id') id: string) {
    return this.shipping.start(req.user!.companyId, req.user!.userId, id);
  }

  @Post(':id/ship/complete')
  @Roles(Role.ADMIN, Role.DELIVERY)
  complete(@Req() req: Request, @Param('id') id: string) {
    return this.shipping.complete(req.user!.companyId, req.user!.userId, id);
  }
}
