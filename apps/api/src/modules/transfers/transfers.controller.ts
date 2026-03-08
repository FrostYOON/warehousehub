import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import type { Request } from 'express';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TransfersService } from './transfers.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { ListTransfersQueryDto } from './dto/list-transfers-query.dto';

@ApiTags('Transfers')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN, Role.WH_MANAGER)
@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfers: TransfersService) {}

  @Post()
  @ApiOkResponse({
    schema: {
      example: {
        id: 'uuid',
        status: 'PENDING',
        fromWarehouse: { id: 'wh1', name: 'DRY', type: 'DRY' },
        toWarehouse: { id: 'wh2', name: 'DRY 부산', type: 'DRY' },
        lines: [{ lotId: 'lot1', qty: 10, lot: { itemCode: 'A001', itemName: 'Item' } }],
      },
    },
  })
  create(@Req() req: Request, @Query() _query: never, body: CreateTransferDto) {
    if (!body?.fromWarehouseId || !body?.toWarehouseId || !body?.lines) {
      throw new BadRequestException('fromWarehouseId, toWarehouseId, lines are required');
    }
    return this.transfers.create(req.user!.companyId, req.user!.userId, body);
  }

  @Get()
  @ApiOkResponse({
    schema: {
      example: {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      },
    },
  })
  list(@Req() req: Request, @Query() query: ListTransfersQueryDto) {
    return this.transfers.list(req.user!.companyId, query);
  }

  @Get(':id')
  @ApiOkResponse({
    schema: {
      example: {
        id: 'uuid',
        status: 'PENDING',
        fromWarehouse: {},
        toWarehouse: {},
        lines: [],
      },
    },
  })
  getOne(@Req() req: Request, @Param('id') id: string) {
    return this.transfers.getOne(req.user!.companyId, id);
  }

  @Patch(':id/confirm')
  @ApiOkResponse({
    schema: {
      example: {
        id: 'uuid',
        status: 'CONFIRMED',
        confirmedAt: '2026-03-05T12:00:00.000Z',
      },
    },
  })
  confirm(@Req() req: Request, @Param('id') id: string) {
    return this.transfers.confirm(req.user!.companyId, req.user!.userId, id);
  }

  @Patch(':id/cancel')
  @ApiOkResponse({
    schema: {
      example: {
        id: 'uuid',
        status: 'CANCELLED',
      },
    },
  })
  cancel(@Req() req: Request, @Param('id') id: string) {
    return this.transfers.cancel(req.user!.companyId, id);
  }
}
