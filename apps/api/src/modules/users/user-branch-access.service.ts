import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * 담당 지사 기반 접근 제어
 * - 담당 지사(branchIds)가 있으면: 해당 지사 데이터만 조회 가능
 * - 담당 지사가 없으면: 전체 지사 접근
 * - supervisorId가 있으면: 하위 담당자 이력 조회 가능
 */
@Injectable()
export class UserBranchAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 사용자의 담당 지사 ID 목록 반환
   * @returns null = 전체 지사 접근, string[] = 해당 지사만 접근
   */
  async getUserBranchIds(
    companyId: string,
    userId: string,
  ): Promise<string[] | null> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
      select: {
        branchUsers: { select: { branchId: true } },
      },
    });
    if (!user) return null;
    if (user.branchUsers.length === 0) return null; // 전체 접근
    return user.branchUsers.map((bu) => bu.branchId);
  }

  /**
   * 현재 사용자가 targetUserId의 상위 관리자인지 확인
   * (하위 담당자 이력 조회 시 사용)
   */
  async canViewSuperviseeHistory(
    companyId: string,
    actorUserId: string,
    targetUserId: string,
  ): Promise<boolean> {
    if (actorUserId === targetUserId) return true;
    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, companyId },
      select: { supervisorId: true },
    });
    return target?.supervisorId === actorUserId;
  }
}
