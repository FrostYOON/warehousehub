import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { UserBranchAccessService } from '../users/user-branch-access.service';
import { WarehousesService } from './warehouses.service';

@ApiTags('Warehouses')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('warehouses')
export class WarehousesController {
  constructor(
    private readonly warehouses: WarehousesService,
    private readonly userBranchAccess: UserBranchAccessService,
  ) {}

  @Get()
  @ApiOkResponse({
    schema: {
      example: [
        { id: 'uuid', type: 'DRY', name: 'DRY' },
        { id: 'uuid', type: 'COOL', name: 'COOL' },
        { id: 'uuid', type: 'FRZ', name: 'FRZ' },
      ],
    },
  })
  async list(@Req() req: Request) {
    const { companyId, userId } = req.user!;
    const branchIds = await this.userBranchAccess.getUserBranchIds(
      companyId,
      userId,
    );
    return this.warehouses.list(companyId, branchIds);
  }
}
