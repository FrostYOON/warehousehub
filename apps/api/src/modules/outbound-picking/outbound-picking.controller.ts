import { Controller, Post, Param, Req, UseGuards, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { OutboundPickingService } from './outbound-picking.service';
import { ManualPickDto } from './dto/manual-pick.dto';

@ApiTags('Outbound Picking')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('outbound/orders')
export class OutboundPickingController {
  constructor(private readonly picking: OutboundPickingService) {}

  @Post(':id/pick/submit')
  @Roles(Role.ADMIN, Role.WH_MANAGER)
  submit(@Req() req: Request, @Param('id') id: string) {
    return this.picking.submit(req.user!.companyId, req.user!.userId, id);
  }

  @Post(':id/pick/manual')
  @Roles(Role.ADMIN, Role.WH_MANAGER)
  manualPick(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: ManualPickDto,
  ) {
    return this.picking.manualPick(
      req.user!.companyId,
      req.user!.userId,
      id,
      dto,
    );
  }
}
