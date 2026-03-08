import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import type { Request, Response } from 'express';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateUserDepartmentDto } from './dto/update-user-department.dto';
import { BulkDeactivateDto } from './dto/bulk-deactivate.dto';
import { BulkRoleDto } from './dto/bulk-role.dto';
import { hashPassword } from '../../common/utils/password.util';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({
    schema: {
      example: {
        total: 10,
        page: 1,
        limit: 20,
        items: [{ id: 'uuid', email: 'a@b.com', role: 'DELIVERY' }],
      },
    },
  })
  list(@Req() req: Request, @Query() query: ListUsersQueryDto) {
    const { companyId } = req.user!;
    return this.users.listUsersByCompany(companyId, {
      role: query.role,
      isActive: query.isActive,
      page: query.page,
      limit: query.limit,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  @Get('audit-logs/export')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  async exportAuditLogs(@Req() req: Request, @Res() res: Response, @Query() query: ListAuditLogsQueryDto) {
    const { companyId } = req.user!;
    const file = await this.users.exportCompanyAuditLogs(companyId, {
      action: query.action,
      userId: query.userId,
      actorUserId: query.actorUserId,
      from: query.from,
      to: query.to,
    });
    const fileName = `audit-logs-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(file);
  }

  @Get('audit-logs')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({
    schema: {
      example: {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
      },
    },
  })
  listAuditLogs(@Req() req: Request, @Query() query: ListAuditLogsQueryDto) {
    const { companyId } = req.user!;
    return this.users.listCompanyAuditLogs(companyId, {
      action: query.action,
      userId: query.userId,
      actorUserId: query.actorUserId,
      from: query.from,
      to: query.to,
      page: query.page,
      limit: query.limit,
    });
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
      departmentCode: dto.departmentCode ?? null,
      supervisorId: dto.supervisorId ?? null,
      branchIds: dto.branchIds,
    });
  }

  @Patch('bulk-deactivate')
  bulkDeactivate(@Req() req: Request, @Body() dto: BulkDeactivateDto) {
    const { companyId, userId } = req.user!;
    return this.users.bulkDeactivate(companyId, dto.userIds, userId);
  }

  @Patch('bulk-role')
  bulkRole(@Req() req: Request, @Body() dto: BulkRoleDto) {
    const { companyId, userId } = req.user!;
    return this.users.bulkRole(companyId, dto.userIds, dto.role, userId);
  }

  @Patch(':id/department')
  @ApiOkResponse({
    schema: {
      example: {
        id: 'uuid',
        departmentCode: 'SALES',
        supervisorId: 'uuid',
        branchIds: ['uuid1'],
      },
    },
  })
  updateDepartment(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateUserDepartmentDto,
  ) {
    const { companyId } = req.user!;
    return this.users.updateDepartment(companyId, id, {
      departmentCode: dto.departmentCode,
      supervisorId: dto.supervisorId,
      branchIds: dto.branchIds,
    });
  }

  @Patch(':id/role')
  async updateRole(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    const { companyId, userId } = req.user!;
    return this.users.updateRole(companyId, id, dto.role, userId);
  }

  @Get(':id/audit-logs')
  auditLogs(@Req() req: Request, @Param('id') id: string) {
    const { companyId } = req.user!;
    return this.users.listUserAuditLogs(companyId, id);
  }

  @Patch(':id/deactivate')
  deactivate(@Req() req: Request, @Param('id') id: string) {
    const { companyId, userId } = req.user!;
    return this.users.deactivate(companyId, id, userId);
  }

  @Patch(':id/activate')
  async activate(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const { companyId, userId } = req.user!;
    return this.users.activate(companyId, id, userId);
  }

  @Delete(':id')
  @ApiOkResponse({ schema: { example: { deleted: true } } })
  async remove(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    const { companyId } = req.user!;
    return this.users.removeUnapprovedUser(companyId, id);
  }
}
