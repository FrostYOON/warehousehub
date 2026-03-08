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
import { UserBranchAccessService } from '../users/user-branch-access.service';
import { TransfersService } from './transfers.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { ListTransfersQueryDto } from './dto/list-transfers-query.dto';

@ApiTags('Transfers')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN, Role.WH_MANAGER)
@Controller('transfers')
export class TransfersController {
  constructor(
    private readonly transfers: TransfersService,
    private readonly userBranchAccess: UserBranchAccessService,
  ) {}

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
  async list(@Req() req: Request, @Query() query: ListTransfersQueryDto) {
    const branchIds = await this.userBranchAccess.getUserBranchIds(
      req.user!.companyId,
      req.user!.userId,
    );
    return this.transfers.list(req.user!.companyId, query, branchIds);
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
  async getOne(@Req() req: Request, @Param('id') id: string) {
    const branchIds = await this.userBranchAccess.getUserBranchIds(
      req.user!.companyId,
      req.user!.userId,
    );
    return this.transfers.getOne(req.user!.companyId, id, branchIds);
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
