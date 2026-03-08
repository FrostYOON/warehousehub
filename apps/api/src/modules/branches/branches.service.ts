import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string, branchIds?: string[] | null) {
    return this.prisma.branch.findMany({
      where: {
        companyId,
        ...(branchIds?.length && { id: { in: branchIds } }),
      },
      orderBy: [{ name: 'asc' }],
      include: {
        _count: { select: { warehouses: true } },
      },
    });
  }

  async findById(companyId: string, id: string, branchIds?: string[] | null) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, companyId },
      include: {
        warehouses: {
          select: {
            id: true,
            type: true,
            name: true,
            region: true,
            createdAt: true,
          },
        },
      },
    });
    if (!branch) throw new NotFoundException('지사를 찾을 수 없습니다.');
    if (branchIds?.length && !branchIds.includes(branch.id)) {
      throw new NotFoundException('지사를 찾을 수 없습니다.');
    }
    return branch;
  }

  async create(companyId: string, dto: CreateBranchDto) {
    const name = dto.name.trim();
    const code = dto.code?.trim() || null;

    try {
      return await this.prisma.branch.create({
        data: {
          companyId,
          name,
          code,
        },
        include: {
          _count: { select: { warehouses: true } },
        },
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          '같은 회사 내에 동일한 지사 코드가 이미 등록되어 있습니다.',
        );
      }
      throw error;
    }
  }
}
