import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { Role } from '@prisma/client';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ReturnsService } from './returns.service';

import { CreateReturnReceiptDto } from './dto/create-return.dto';
import { UpdateReturnReceiptDto } from './dto/update-return.dto';
import { DecideReturnReceiptDto } from './dto/decide-return.dto';
import { ProcessReturnReceiptDto } from './dto/process-return.dto';

@ApiTags('Returns')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('returns')
export class ReturnsController {
  constructor(private readonly returns: ReturnsService) {}

  // 접수: DELIVERY, SALES, ADMIN
  @Post()
  @Roles(Role.ADMIN, Role.DELIVERY, Role.SALES)
  create(@Req() req: Request, @Body() dto: CreateReturnReceiptDto) {
    return this.returns.create(req.user!.companyId, req.user!.userId, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.DELIVERY, Role.SALES, Role.WH_MANAGER)
  list(@Req() req: Request) {
    return this.returns.list(req.user!.companyId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.DELIVERY, Role.SALES, Role.WH_MANAGER)
  detail(@Req() req: Request, @Param('id') id: string) {
    return this.returns.detail(req.user!.companyId, id);
  }

  // 접수 수정: DELIVERY, SALES, ADMIN (RECEIVED 상태에서만)
  @Patch(':id')
  @Roles(Role.ADMIN, Role.DELIVERY, Role.SALES)
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateReturnReceiptDto,
  ) {
    return this.returns.update(req.user!.companyId, id, dto);
  }

  // 접수 취소: DELIVERY, SALES, ADMIN (RECEIVED 상태에서만)
  @Patch(':id/cancel')
  @Roles(Role.ADMIN, Role.DELIVERY, Role.SALES)
  cancel(@Req() req: Request, @Param('id') id: string) {
    return this.returns.cancel(req.user!.companyId, id);
  }

  // 결정: WH_MANAGER, ADMIN (RECEIVED -> DECIDED)
  @Post(':id/decide')
  @Roles(Role.ADMIN, Role.WH_MANAGER)
  decide(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: DecideReturnReceiptDto,
  ) {
    return this.returns.decide(req.user!.companyId, req.user!.userId, id, dto);
  }

  // 재고 반영: WH_MANAGER, ADMIN (DECIDED -> COMPLETED)
  @Post(':id/process')
  @Roles(Role.ADMIN, Role.WH_MANAGER)
  process(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: ProcessReturnReceiptDto,
  ) {
    return this.returns.process(req.user!.companyId, req.user!.userId, id, dto);
  }
}
