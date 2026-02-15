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
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { Request } from 'express';

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { hashPassword } from '../../common/utils/password.util';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOkResponse({
    schema: { example: [{ id: 'uuid', email: 'a@b.com', role: 'DELIVERY' }] },
  })
  list(@Req() req: Request) {
    const { companyId } = req.user!;
    return this.users.listUsersByCompany(companyId);
  }

  @Post()
  @ApiOkResponse({
    schema: { example: { id: 'uuid', email: 'x@y.com', role: 'DELIVERY' } },
  })
  async create(@Req() req: Request, @Body() dto: CreateUserDto) {
    const { companyId } = req.user!;

    const passwordHash = await hashPassword(dto.password);

    return this.users.createUser({
      companyId,
      email: dto.email,
      name: dto.name,
      passwordHash,
      role: dto.role,
    });
  }

  @Patch(':id/role')
  async updateRole(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    const { companyId } = req.user!;
    return this.users.updateRole(companyId, id, dto.role);
  }

  @Patch(':id/deactivate')
  deactivate(@Req() req: Request, @Param('id') id: string) {
    const { companyId } = req.user!;
    return this.users.deactivate(companyId, id);
  }
}
