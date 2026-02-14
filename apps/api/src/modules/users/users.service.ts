import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findActiveUserByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email, isActive: true },
      include: { company: true },
    });
  }

  findUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });
  }

  async createCompanyWithAdmin(params: {
    companyName: string;
    email: string;
    passwordHash: string;
    name: string;
  }) {
    const company = await this.prisma.company.create({
      data: { name: params.companyName },
    });

    const user = await this.prisma.user.create({
      data: {
        companyId: company.id,
        email: params.email,
        passwordHash: params.passwordHash,
        name: params.name,
        role: Role.ADMIN,
        isActive: true,
      },
      include: { company: true },
    });

    return { company, user };
  }

  async deactivateUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
  }
}
