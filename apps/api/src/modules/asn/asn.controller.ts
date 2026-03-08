import {
  Body,
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
import { AsnService } from './asn.service';
import { CreateAsnDto } from './dto/create-asn.dto';
import { ListAsnQueryDto } from './dto/list-asn-query.dto';

@ApiTags('ASN (입고 예정)')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('asn')
export class AsnController {
  constructor(
    private readonly asn: AsnService,
    private readonly userBranchAccess: UserBranchAccessService,
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.WH_MANAGER)
  @ApiOkResponse({ description: '입고 예정 목록' })
  async list(@Req() req: Request, @Query() query: ListAsnQueryDto) {
    const branchIds = await this.userBranchAccess.getUserBranchIds(
      req.user!.companyId,
      req.user!.userId,
    );
    return this.asn.list(req.user!.companyId, query, branchIds);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.WH_MANAGER)
  @ApiOkResponse({ description: '입고 예정 상세' })
  async get(@Req() req: Request, @Param('id') id: string) {
    const branchIds = await this.userBranchAccess.getUserBranchIds(
      req.user!.companyId,
      req.user!.userId,
    );
    return this.asn.findById(req.user!.companyId, id, branchIds);
  }

  @Post()
  @Roles(Role.ADMIN, Role.WH_MANAGER)
  @ApiOkResponse({ description: '입고 예정 등록' })
  create(@Req() req: Request, @Body() dto: CreateAsnDto) {
    return this.asn.create(req.user!.companyId, req.user!.userId, dto);
  }

  @Patch(':id/cancel')
  @Roles(Role.ADMIN, Role.WH_MANAGER)
  @ApiOkResponse({ description: '입고 예정 취소 (PENDING만 가능)' })
  cancel(@Req() req: Request, @Param('id') id: string) {
    return this.asn.cancel(req.user!.companyId, id);
  }
}
