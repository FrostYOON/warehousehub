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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@ApiTags('Customers')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Post()
  @Roles(Role.ADMIN, Role.WH_MANAGER)
  create(@Req() req: Request, @Body() dto: CreateCustomerDto) {
    return this.customers.create(req.user!.companyId, dto);
  }

  @Get()
  @Roles(
    Role.ADMIN,
    Role.WH_MANAGER,
    Role.DELIVERY,
    Role.ACCOUNTING,
    Role.SALES,
  )
  list(
    @Req() req: Request,
    @Query('q') q?: string,
    @Query('includeInactive') includeInactive?: string,
    @Query('isActive') isActive?: string,
  ) {
    const opts: { q?: string; includeInactive?: boolean; isActive?: boolean } =
      {};
    if (q) opts.q = q;
    if (includeInactive === 'true') opts.includeInactive = true;
    if (isActive === 'true' || isActive === 'false') {
      opts.isActive = isActive === 'true';
    }
    return this.customers.list(req.user!.companyId, opts);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.WH_MANAGER)
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customers.update(req.user!.companyId, id, dto);
  }

  @Patch(':id/deactivate')
  @Roles(Role.ADMIN, Role.WH_MANAGER)
  deactivate(@Req() req: Request, @Param('id') id: string) {
    return this.customers.deactivate(req.user!.companyId, id);
  }

  @Patch(':id/activate')
  @Roles(Role.ADMIN, Role.WH_MANAGER)
  activate(@Req() req: Request, @Param('id') id: string) {
    return this.customers.activate(req.user!.companyId, id);
  }
}
