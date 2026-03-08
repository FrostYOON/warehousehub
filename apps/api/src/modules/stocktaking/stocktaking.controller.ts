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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import type { Request } from 'express';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StocktakingService } from './stocktaking.service';
import { CreateStocktakingDto } from './dto/create-stocktaking.dto';
import { AddLinesDto } from './dto/add-lines.dto';
import { UpdateLineActualQtyDto } from './dto/update-line-actual-qty.dto';
import { ListStocktakingQueryDto } from './dto/list-stocktaking-query.dto';

type AuthedRequest = Request & {
  user: { companyId: string; userId: string; role: Role };
};

@ApiTags('Stocktaking')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('stocktaking')
export class StocktakingController {
  constructor(private readonly stocktaking: StocktakingService) {}

  @Post()
  @Roles(Role.ADMIN, Role.WH_MANAGER)
  create(@Req() req: AuthedRequest, @Body() dto: CreateStocktakingDto) {
    return this.stocktaking.create(req.user.companyId, req.user.userId, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.WH_MANAGER, Role.ACCOUNTING)
  list(@Req() req: AuthedRequest, @Query() query: ListStocktakingQueryDto) {
    return this.stocktaking.list(req.user.companyId, query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.WH_MANAGER, Role.ACCOUNTING)
  getOne(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.stocktaking.getOne(req.user.companyId, id);
  }

  @Patch(':id/lines')
  @Roles(Role.ADMIN, Role.WH_MANAGER)
  addLines(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() dto: AddLinesDto,
  ) {
    return this.stocktaking.addLines(req.user.companyId, id, dto);
  }

  @Patch(':id/lines/:lineId')
  @Roles(Role.ADMIN, Role.WH_MANAGER)
  updateLineActualQty(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @Body() dto: UpdateLineActualQtyDto,
  ) {
    return this.stocktaking.updateLineActualQty(
      req.user.companyId,
      id,
      lineId,
      dto,
    );
  }

  @Patch(':id/confirm')
  @Roles(Role.ADMIN, Role.WH_MANAGER)
  confirm(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.stocktaking.confirm(req.user.companyId, id, req.user.userId);
  }
}
