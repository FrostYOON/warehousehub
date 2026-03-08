import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async getCompanyBranding(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        brandPrimaryColor: true,
      },
    });
    if (!company) throw new NotFoundException('Company not found');
    return {
      id: company.id,
      name: company.name,
      logoUrl: company.logoUrl ?? null,
      brandPrimaryColor: company.brandPrimaryColor ?? null,
    };
  }

  async updateCompanyBranding(
    companyId: string,
    userId: string,
    userRole: Role,
    dto: { logoUrl?: string | null; brandPrimaryColor?: string | null },
  ) {
    if (userRole !== Role.ADMIN) {
      throw new ForbiddenException('ADMIN만 회사 설정을 변경할 수 있습니다.');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });
    if (!user || user.companyId !== companyId) {
      throw new ForbiddenException('해당 회사에 대한 권한이 없습니다.');
    }
    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.brandPrimaryColor !== undefined && {
          brandPrimaryColor: dto.brandPrimaryColor,
        }),
      },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        brandPrimaryColor: true,
      },
    });
    return {
      id: updated.id,
      name: updated.name,
      logoUrl: updated.logoUrl ?? null,
      brandPrimaryColor: updated.brandPrimaryColor ?? null,
    };
  }
}
