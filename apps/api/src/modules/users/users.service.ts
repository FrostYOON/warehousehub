import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveUserByEmail(companyId: string, email: string) {
    const user = await this.prisma.user.findFirst({
      where: { companyId, email, isActive: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findUserById(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findCompanyByName(name: string) {
    const company = await this.prisma.company.findUnique({ where: { name } });
    if (!company) throw new NotFoundException('Company not found');
    return company;
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
    try {
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
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Email already in use');
        }
      }
      throw error;
    }
  }

  async updateRole(companyId: string, userId: string, role: Role) {
    const user = await this.prisma.user.updateMany({
      where: { id: userId, companyId },
      data: { role },
    });

    if (user.count === 0) throw new NotFoundException('User not found');
    return this.prisma.user.findUnique({
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
  }

  async deactivate(companyId: string, userId: string) {
    const user = await this.prisma.user.updateMany({
      where: { id: userId, companyId },
      data: { isActive: false },
    });

    if (user.count === 0) throw new NotFoundException('User not found');

    return this.prisma.user.findUnique({
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
  }
}
