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
    return this.prisma.company.findUnique({ where: { name } });
  }

  async createCompanyWithAdmin(params: {
    companyName: string;
    adminEmail: string;
    adminName: string;
    passwordHash: string;
  }) {
    const existingCompany = await this.prisma.company.findUnique({
      where: { name: params.companyName },
    });
    if (existingCompany) throw new ConflictException('Company already exists');

    const company = await this.prisma.company.create({
      data: { name: params.companyName },
    });
    await this.prisma.warehouse.createMany({
      data: [
        {
          companyId: company.id,
          type: StorageType.DRY,
          name: 'DRY',
          region: 'default',
        },
        {
          companyId: company.id,
          type: StorageType.COOL,
          name: 'COOL',
          region: 'default',
        },
        {
          companyId: company.id,
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
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return { total, page, limit, items };
  }

  async createUser(params: {
    companyId: string;
    email: string;
    name: string;
    passwordHash: string;
    role: Role;
    isActive?: boolean;
  }) {
    try {
      const created = await this.prisma.user.create({
        data: {
          companyId: params.companyId,
          email: params.email,
          name: params.name,
          passwordHash: params.passwordHash,
          role: params.role,
          isActive: params.isActive ?? true,
        },
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
        event: 'users.create.success',
        companyId: params.companyId,
        userId: created.id,
        role: created.role,
      });
      return created;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Email already in use');
        }
      }
      throw error;
    }
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
