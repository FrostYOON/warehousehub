import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, StorageType } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { Prisma } from '@prisma/client';
import ExcelJS from 'exceljs';
import { getModuleLogger } from '../../common/logging/module-logger';

const logger = getModuleLogger('UsersService');

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveUserByEmail(companyId: string, email: string) {
    const normalized = email?.trim() ?? '';
    if (!normalized) return null;
    return this.prisma.user.findFirst({
      where: { companyId, email: normalized, isActive: true },
    });
  }

  async findUserById(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findCompanyByName(name: string) {
    return this.prisma.company.findUnique({
      where: { name },
      select: { id: true, name: true },
    });
  }

  async createCompanyWithAdmin(params: {
    companyName: string;
    adminEmail: string;
    adminName: string;
    passwordHash: string;
  }) {
    const existingCompany = await this.prisma.company.findUnique({
      where: { name: params.companyName },
      select: { id: true },
    });
    if (existingCompany) throw new ConflictException('Company already exists');

    const company = await this.prisma.company.create({
      data: { name: params.companyName },
    });

    const defaultBranch = await this.prisma.branch.create({
      data: {
        companyId: company.id,
        name: params.companyName + ' (본사)',
        code: 'DEFAULT',
      },
    });

    await this.prisma.warehouse.createMany({
      data: [
        {
          companyId: company.id,
          branchId: defaultBranch.id,
          type: StorageType.DRY,
          name: 'DRY',
          region: 'default',
        },
        {
          companyId: company.id,
          branchId: defaultBranch.id,
          type: StorageType.COOL,
          name: 'COOL',
          region: 'default',
        },
        {
          companyId: company.id,
          branchId: defaultBranch.id,
          type: StorageType.FRZ,
          name: 'FRZ',
          region: 'default',
        },
      ],
    });

    const user = await this.prisma.user.create({
      data: {
        companyId: company.id,
        email: params.adminEmail,
        passwordHash: params.passwordHash,
        name: params.adminName,
        role: Role.ADMIN,
        isActive: true,
      },
    });

    logger.info({
      event: 'users.company_admin_created',
      companyId: company.id,
      adminUserId: user.id,
    });

    return { company, user };
  }

  async listUsersByCompany(
    companyId: string,
    filters?: {
      role?: Role;
      isActive?: boolean;
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: 'name' | 'email' | 'createdAt' | 'updatedAt';
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    const page = Math.max(1, filters?.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters?.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: {
      companyId: string;
      role?: Role;
      isActive?: boolean;
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' };
        email?: { contains: string; mode: 'insensitive' };
      }>;
    } = { companyId };

    if (filters?.role !== undefined) where.role = filters.role;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    const search = filters?.search?.trim();
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const sortBy = filters?.sortBy ?? 'createdAt';
    const sortOrder = filters?.sortOrder ?? 'desc';
    const orderBy = { [sortBy]: sortOrder } as const;

    const [total, items] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          departmentCode: true,
          supervisorId: true,
          supervisor: {
            select: { id: true, name: true, email: true },
          },
          branchUsers: {
            select: {
              branch: { select: { id: true, name: true, code: true } },
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      items: items.map((u) => ({
        ...u,
        branchIds: u.branchUsers.map((bu) => bu.branch.id),
        branches: u.branchUsers.map((bu) => bu.branch),
      })),
    };
  }

  async createUser(params: {
    companyId: string;
    email: string;
    name: string;
    passwordHash: string;
    role: Role;
    isActive?: boolean;
    departmentCode?: string | null;
    supervisorId?: string | null;
    branchIds?: string[];
  }) {
    try {
      if (params.supervisorId) {
        const sup = await this.prisma.user.findFirst({
          where: {
            id: params.supervisorId,
            companyId: params.companyId,
          },
        });
        if (!sup) throw new BadRequestException('상위 관리자를 찾을 수 없습니다.');
      }
      if (params.branchIds?.length) {
        const branches = await this.prisma.branch.findMany({
          where: {
            id: { in: params.branchIds },
            companyId: params.companyId,
          },
          select: { id: true },
        });
        if (branches.length !== params.branchIds.length) {
          throw new BadRequestException('일부 담당 지사를 찾을 수 없습니다.');
        }
      }

      const created = await this.prisma.user.create({
        data: {
          companyId: params.companyId,
          email: params.email,
          name: params.name,
          passwordHash: params.passwordHash,
          role: params.role,
          isActive: params.isActive ?? true,
          departmentCode: params.departmentCode ?? null,
          supervisorId: params.supervisorId ?? null,
          branchUsers:
            params.branchIds?.length &&
            params.branchIds.length > 0
              ? {
                  create: params.branchIds.map((branchId) => ({ branchId })),
                }
              : undefined,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          departmentCode: true,
          supervisorId: true,
          supervisor: {
            select: { id: true, name: true, email: true },
          },
          branchUsers: {
            select: {
              branch: { select: { id: true, name: true, code: true } },
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      });
    logger.info({
      event: 'users.create.success',
      companyId: params.companyId,
      userId: created.id,
      role: created.role,
    });
    return {
      ...created,
      branchIds: created.branchUsers.map((bu) => bu.branch.id),
      branches: created.branchUsers.map((bu) => bu.branch),
    };
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Email already in use');
        }
      }
      throw error;
    }
  }

  async updateDepartment(
    companyId: string,
    userId: string,
    params: {
      departmentCode?: string | null;
      supervisorId?: string | null;
      branchIds?: string[];
    },
  ) {
    const target = await this.prisma.user.findUnique({
      where: { id: userId, companyId },
      select: { id: true, supervisorId: true },
    });
    if (!target) throw new NotFoundException('User not found');

    if (params.supervisorId !== undefined) {
      if (params.supervisorId) {
        const sup = await this.prisma.user.findFirst({
          where: {
            id: params.supervisorId,
            companyId,
          },
        });
        if (!sup) throw new BadRequestException('상위 관리자를 찾을 수 없습니다.');
        if (params.supervisorId === userId) {
          throw new BadRequestException('본인을 관리자로 지정할 수 없습니다.');
        }
      }
    }

    if (params.branchIds !== undefined && params.branchIds.length > 0) {
      const branches = await this.prisma.branch.findMany({
        where: { id: { in: params.branchIds }, companyId },
        select: { id: true },
      });
      if (branches.length !== params.branchIds.length) {
        throw new BadRequestException('일부 담당 지사를 찾을 수 없습니다.');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId, companyId },
        data: {
          ...(params.departmentCode !== undefined && {
            departmentCode: params.departmentCode ?? null,
          }),
          ...(params.supervisorId !== undefined && {
            supervisorId: params.supervisorId ?? null,
          }),
        },
      });

      if (params.branchIds !== undefined) {
        await tx.branchUser.deleteMany({ where: { userId } });
        if (params.branchIds.length > 0) {
          await tx.branchUser.createMany({
            data: params.branchIds.map((branchId) => ({ userId, branchId })),
          });
        }
      }
    });

    const updated = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        departmentCode: true,
        supervisorId: true,
        supervisor: {
          select: { id: true, name: true, email: true },
        },
        branchUsers: {
          select: {
            branch: { select: { id: true, name: true, code: true } },
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
    logger.info({
      event: 'users.department_updated',
      companyId,
      userId,
    });
    return {
      ...updated,
      branchIds: updated!.branchUsers.map((bu) => bu.branch.id),
      branches: updated!.branchUsers.map((bu) => bu.branch),
    };
  }

  async updateRole(
    companyId: string,
    userId: string,
    role: Role,
    actorUserId: string,
  ) {
    const target = await this.prisma.user.findUnique({
      where: { id: userId, companyId },
      select: { id: true, role: true },
    });
    if (!target) throw new NotFoundException('User not found');

    // 본인이 자신의 역할을 ADMIN → 하위로 변경하려는 경우 차단
    if (
      userId === actorUserId &&
      target.role === Role.ADMIN &&
      role !== Role.ADMIN
    ) {
      throw new ForbiddenException('본인의 관리자 역할을 제거할 수 없습니다.');
    }

    const beforeRole = target.role;
    const user = await this.prisma.user.updateMany({
      where: { id: userId, companyId },
      data: { role },
    });

    if (user.count === 0) throw new NotFoundException('User not found');

    await this.createUserAuditLog({
      userId,
      actorUserId,
      action: 'ROLE_CHANGED',
      beforeValue: JSON.stringify({ role: beforeRole }),
      afterValue: JSON.stringify({ role }),
    });

    const updated = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    logger.info({
      event: 'users.role_updated',
      companyId,
      userId,
      role,
    });
    return updated;
  }

  async deactivate(
    companyId: string,
    userId: string,
    actorUserId: string,
    options?: { allowSelf?: boolean },
  ) {
    const target = await this.prisma.user.findUnique({
      where: { id: userId, companyId },
      select: { id: true, role: true },
    });
    if (!target) throw new NotFoundException('User not found');

    // 회원 관리 API에서 본인 비활성화 차단 (withdraw는 allowSelf로 허용)
    if (!options?.allowSelf && userId === actorUserId) {
      throw new ForbiddenException('본인 계정은 비활성화할 수 없습니다.');
    }
    // ADMIN 계정 비활성화 차단 (탈퇴 시에도 ADMIN은 유지 가능하도록 - 필요 시 검토)
    if (target.role === Role.ADMIN && userId !== actorUserId) {
      throw new ForbiddenException('관리자 계정은 비활성화할 수 없습니다.');
    }

    const user = await this.prisma.user.updateMany({
      where: { id: userId, companyId },
      data: { isActive: false },
    });

    if (user.count === 0) throw new NotFoundException('User not found');

    await this.createUserAuditLog({
      userId,
      actorUserId,
      action: 'DEACTIVATED',
      beforeValue: JSON.stringify({ isActive: true }),
      afterValue: JSON.stringify({ isActive: false }),
    });

    const deactivated = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    logger.warn({
      event: 'users.deactivated',
      companyId,
      userId,
    });
    return deactivated;
  }

  async activate(companyId: string, userId: string, actorUserId: string) {
    const target = await this.prisma.user.findUnique({
      where: { id: userId, companyId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('User not found');

    const user = await this.prisma.user.updateMany({
      where: { id: userId, companyId },
      data: { isActive: true },
    });

    if (user.count === 0) throw new NotFoundException('User not found');

    await this.createUserAuditLog({
      userId,
      actorUserId,
      action: 'ACTIVATED',
      beforeValue: JSON.stringify({ isActive: false }),
      afterValue: JSON.stringify({ isActive: true }),
    });

    const activated = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    logger.info({
      event: 'users.activated',
      companyId,
      userId,
    });
    return activated;
  }

  private async createUserAuditLog(params: {
    userId: string;
    actorUserId: string;
    action: string;
    beforeValue?: string;
    afterValue?: string;
  }) {
    await this.prisma.userAuditLog.create({
      data: {
        userId: params.userId,
        actorUserId: params.actorUserId,
        action: params.action,
        beforeValue: params.beforeValue ?? null,
        afterValue: params.afterValue ?? null,
      },
    });
  }

  async listUserAuditLogs(
    companyId: string,
    userId: string,
    options?: { limit?: number },
  ) {
    const limit = Math.min(100, Math.max(1, options?.limit ?? 20));
    const target = await this.prisma.user.findUnique({
      where: { id: userId, companyId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('User not found');

    const logs = await this.prisma.userAuditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        actorUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    return { items: logs };
  }

  async listCompanyAuditLogs(
    companyId: string,
    params: {
      action?: string;
      userId?: string;
      actorUserId?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.UserAuditLogWhereInput = {
      user: { companyId },
    };

    if (params.action?.trim()) {
      where.action = { contains: params.action.trim(), mode: 'insensitive' };
    }
    if (params.userId?.trim()) {
      where.userId = params.userId.trim();
    }
    if (params.actorUserId?.trim()) {
      where.actorUserId = params.actorUserId.trim();
    }
    if (params.from || params.to) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (params.from) dateFilter.gte = new Date(params.from);
      if (params.to) {
        const toDate = new Date(params.to);
        toDate.setHours(23, 59, 59, 999);
        dateFilter.lte = toDate;
      }
      where.createdAt = dateFilter;
    }

    const [logs, total] = await Promise.all([
      this.prisma.userAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
          actorUser: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.userAuditLog.count({ where }),
    ]);

    return {
      items: logs.map((l) => ({
        id: l.id,
        userId: l.userId,
        actorUserId: l.actorUserId,
        action: l.action,
        beforeValue: l.beforeValue,
        afterValue: l.afterValue,
        createdAt: l.createdAt.toISOString(),
        user: l.user,
        actorUser: l.actorUser,
      })),
      total,
      page,
      limit,
    };
  }

  async exportCompanyAuditLogs(
    companyId: string,
    params: {
      action?: string;
      userId?: string;
      actorUserId?: string;
      from?: string;
      to?: string;
    },
  ): Promise<Buffer> {
    const where: Prisma.UserAuditLogWhereInput = {
      user: { companyId },
    };

    if (params.action?.trim()) {
      where.action = { contains: params.action.trim(), mode: 'insensitive' };
    }
    if (params.userId?.trim()) {
      where.userId = params.userId.trim();
    }
    if (params.actorUserId?.trim()) {
      where.actorUserId = params.actorUserId.trim();
    }
    if (params.from || params.to) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (params.from) dateFilter.gte = new Date(params.from);
      if (params.to) {
        const toDate = new Date(params.to);
        toDate.setHours(23, 59, 59, 999);
        dateFilter.lte = toDate;
      }
      where.createdAt = dateFilter;
    }

    const logs = await this.prisma.userAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10000,
      include: {
        user: { select: { name: true, email: true } },
        actorUser: { select: { name: true, email: true } },
      },
    });

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('감사로그');
    ws.columns = [
      { header: '일시', key: 'createdAt', width: 20 },
      { header: '액션', key: 'action', width: 16 },
      { header: '대상(이름)', key: 'targetName', width: 14 },
      { header: '대상(이메일)', key: 'targetEmail', width: 22 },
      { header: '실행자(이름)', key: 'actorName', width: 14 },
      { header: '실행자(이메일)', key: 'actorEmail', width: 22 },
      { header: '이전값', key: 'beforeValue', width: 30 },
      { header: '이후값', key: 'afterValue', width: 30 },
    ];
    ws.addRows(
      logs.map((l) => ({
        createdAt: l.createdAt.toISOString(),
        action: l.action,
        targetName: l.user.name,
        targetEmail: l.user.email,
        actorName: l.actorUser.name,
        actorEmail: l.actorUser.email,
        beforeValue: l.beforeValue ?? '',
        afterValue: l.afterValue ?? '',
      })),
    );

    const buf = await workbook.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  async bulkDeactivate(
    companyId: string,
    userIds: string[],
    actorUserId: string,
  ) {
    const uniqueIds = [...new Set(userIds)];
    const targets = await this.prisma.user.findMany({
      where: { id: { in: uniqueIds }, companyId },
      select: { id: true, role: true },
    });

    const excludable = targets.filter(
      (u) => u.id === actorUserId || u.role === Role.ADMIN,
    );
    const excludableIds = new Set(excludable.map((u) => u.id));
    const allowedIds = uniqueIds.filter((id) => !excludableIds.has(id));

    if (allowedIds.length === 0) {
      throw new BadRequestException(
        '선택한 사용자 중 처리 가능한 대상이 없습니다. 본인과 관리자 계정은 제외됩니다.',
      );
    }

    const result = await this.prisma.user.updateMany({
      where: { id: { in: allowedIds }, companyId },
      data: { isActive: false },
    });

    if (allowedIds.length > 0) {
      await this.prisma.userAuditLog.createMany({
        data: allowedIds.map((userId) => ({
          userId,
          actorUserId,
          action: 'DEACTIVATED',
          beforeValue: JSON.stringify({ isActive: true }),
          afterValue: JSON.stringify({ isActive: false }),
        })),
      });
    }

    logger.info({
      event: 'users.bulk_deactivated',
      companyId,
      count: result.count,
      actorUserId,
    });

    return {
      deactivated: result.count,
      skipped: uniqueIds.length - allowedIds.length,
    };
  }

  async bulkRole(
    companyId: string,
    userIds: string[],
    role: Role,
    actorUserId: string,
  ) {
    const uniqueIds = [...new Set(userIds)];
    const targets = await this.prisma.user.findMany({
      where: { id: { in: uniqueIds }, companyId },
      select: { id: true, role: true },
    });

    const excludable = targets.filter(
      (u) =>
        (u.id === actorUserId && role !== Role.ADMIN) || u.role === Role.ADMIN,
    );
    const excludableIds = new Set(excludable.map((u) => u.id));
    const allowedIds = uniqueIds.filter((id) => !excludableIds.has(id));

    if (allowedIds.length === 0) {
      throw new BadRequestException(
        '선택한 사용자 중 처리 가능한 대상이 없습니다. 본인 역할 변경(ADMIN 제거)과 관리자 계정은 제외됩니다.',
      );
    }

    const bulkUpdateResult = await this.prisma.user.updateMany({
      where: { id: { in: allowedIds }, companyId },
      data: { role },
    });

    if (allowedIds.length > 0 && bulkUpdateResult.count > 0) {
      const auditData = allowedIds.map((userId) => {
        const target = targets.find((t) => t.id === userId);
        const beforeRole = target?.role;
        return {
          userId,
          actorUserId,
          action: 'ROLE_CHANGED' as const,
          beforeValue: beforeRole
            ? JSON.stringify({ role: beforeRole })
            : null,
          afterValue: JSON.stringify({ role }),
        };
      });
      await this.prisma.userAuditLog.createMany({ data: auditData });
    }

    logger.info({
      event: 'users.bulk_role_changed',
      companyId,
      count: allowedIds.length,
      role,
      actorUserId,
    });

    return {
      updated: allowedIds.length,
      skipped: uniqueIds.length - allowedIds.length,
    };
  }

  /**
   * 미승인(isActive=false) 사용자만 삭제 가능. 승인된 사용자는 비활성화만 가능.
   */
  async removeUnapprovedUser(companyId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, companyId: true, isActive: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.companyId !== companyId)
      throw new NotFoundException('User not found');
    if (user.isActive) {
      throw new BadRequestException(
        '승인된 사용자는 삭제할 수 없습니다. 비활성화를 사용하세요.',
      );
    }

    await this.prisma.user.delete({
      where: { id: userId },
    });
    logger.info({
      event: 'users.removed_unapproved',
      companyId,
      userId,
    });
    return { deleted: true };
  }
}
