import {
  Controller,
  Get,
  Header,
  Param,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TraceabilityService } from './traceability.service';

@ApiTags('Traceability')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN, Role.WH_MANAGER, Role.DELIVERY, Role.ACCOUNTING, Role.SALES)
@Controller('traceability')
export class TraceabilityController {
  constructor(private readonly traceability: TraceabilityService) {}

  @Get('lot/:lotId/export')
  @ApiParam({ name: 'lotId', type: String })
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  async exportLotHistory(
    @Req() req: Request,
    @Param('lotId') lotId: string,
    @Res() res: Response,
  ) {
    const file = await this.traceability.exportLotHistory(
      req.user!.companyId,
      lotId,
    );
    const fileName = `lot-history-${lotId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(file);
  }

  @Get('lot/:lotId')
  @ApiParam({ name: 'lotId', type: String })
  @ApiOkResponse({
    schema: {
      example: {
        lot: {
          id: 'uuid',
          itemCode: 'A001',
          itemName: '품목A',
          expiryDate: '2026-06-30',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        inventoryHistory: [],
        pickHistory: [],
        transferHistory: [],
      },
    },
  })
  getLotHistory(@Req() req: Request, @Param('lotId') lotId: string) {
    return this.traceability.getLotHistory(req.user!.companyId, lotId);
  }
}
