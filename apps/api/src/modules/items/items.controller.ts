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
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { ListItemsQueryDto } from './dto/list-items-query.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@ApiTags('Items')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('items')
export class ItemsController {
  constructor(private readonly items: ItemsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.WH_MANAGER)
  create(@Req() req: Request, @Body() dto: CreateItemDto) {
    return this.items.create(req.user!.companyId, dto);
  }

  @Get()
  @Roles(
    Role.ADMIN,
    Role.WH_MANAGER,
    Role.DELIVERY,
    Role.ACCOUNTING,
    Role.SALES,
  )
  list(@Req() req: Request, @Query() query: ListItemsQueryDto) {
    return this.items.list(req.user!.companyId, {
      q: query.q,
      includeInactive: query.includeInactive,
      isActive: query.isActive,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Get(':id')
  @Roles(
    Role.ADMIN,
    Role.WH_MANAGER,
    Role.DELIVERY,
    Role.ACCOUNTING,
    Role.SALES,
  )
  get(@Req() req: Request, @Param('id') id: string) {
    return this.items.findById(req.user!.companyId, id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.WH_MANAGER)
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.items.update(req.user!.companyId, id, dto);
  }

  @Patch(':id/deactivate')
  @Roles(Role.ADMIN, Role.WH_MANAGER)
  deactivate(@Req() req: Request, @Param('id') id: string) {
    return this.items.deactivate(req.user!.companyId, id);
  }

  @Patch(':id/activate')
  @Roles(Role.ADMIN, Role.WH_MANAGER)
  activate(@Req() req: Request, @Param('id') id: string) {
    return this.items.activate(req.user!.companyId, id);
  }
}
