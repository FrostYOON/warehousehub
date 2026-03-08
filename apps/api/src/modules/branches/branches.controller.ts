import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import type { Request } from 'express';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserBranchAccessService } from '../users/user-branch-access.service';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';

@ApiTags('Branches')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('branches')
export class BranchesController {
  constructor(
    private readonly branches: BranchesService,
    private readonly userBranchAccess: UserBranchAccessService,
  ) {}

  @Get()
  @Roles(
    Role.ADMIN,
    Role.WH_MANAGER,
    Role.DELIVERY,
    Role.ACCOUNTING,
    Role.SALES,
  )
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 'uuid',
          companyId: 'uuid',
          name: '토론토',
          code: 'TOR',
          createdAt: '2026-03-07T00:00:00Z',
          updatedAt: '2026-03-07T00:00:00Z',
          _count: { warehouses: 3 },
        },
      ],
    },
  })
  async list(@Req() req: Request) {
    const branchIds = await this.userBranchAccess.getUserBranchIds(
      req.user!.companyId,
      req.user!.userId,
    );
    return this.branches.list(req.user!.companyId, branchIds);
  }

  @Get(':id')
  @Roles(
    Role.ADMIN,
    Role.WH_MANAGER,
    Role.DELIVERY,
    Role.ACCOUNTING,
    Role.SALES,
  )
  async get(@Req() req: Request, @Param('id') id: string) {
    const branchIds = await this.userBranchAccess.getUserBranchIds(
      req.user!.companyId,
      req.user!.userId,
    );
    return this.branches.findById(req.user!.companyId, id, branchIds);
  }

  @Post()
  @Roles(Role.ADMIN, Role.WH_MANAGER)
  create(@Req() req: Request, @Body() dto: CreateBranchDto) {
    return this.branches.create(req.user!.companyId, dto);
  }
}
