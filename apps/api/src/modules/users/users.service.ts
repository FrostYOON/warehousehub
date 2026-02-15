import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findActiveUserByEmail(companyId: string, email: string) {
    return this.prisma.user.findFirst({
      where: { companyId, email, isActive: true },
    });
  }

  findUserById(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  findCompanyByName(name: string) {
    return this.prisma.company.findUnique({ where: { name } });
  }

  async createCompanyWithAdmin(params: {
    companyName: string;
    adminEmail: string;
    adminName: string;
    passwordHash: string;
  }) {
    const company = await this.prisma.company.create({
      data: { name: params.companyName },
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

    return { company, user };
  }

  listUsersByCompany(companyId: string) {
    return this.prisma.user.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
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
  }

  async createUser(params: {
    companyId: string;
    email: string;
    name: string;
    passwordHash: string;
    role: Role;
  }) {
    return this.prisma.user.create({
      data: {
        companyId: params.companyId,
        email: params.email,
        name: params.name,
        passwordHash: params.passwordHash,
        role: params.role,
        isActive: true,
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
  }

  updateRole(companyId: string, userId: string, role: Role) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
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
  }

  deactivate(companyId: string, userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
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
  }
}
