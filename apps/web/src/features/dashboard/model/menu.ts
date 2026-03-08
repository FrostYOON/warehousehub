import {
  canAccessAsn,
  canAccessBranches,
  canAccessCost,
  canAccessCustomers,
  canAccessDashboard,
  canAccessInbound,
  canAccessTemperatureMonitor,
  canAccessTransfers,
  canEditStock,
  canViewStock,
} from '@/features/auth/model/role-policy';
import type { UserRole } from '@/features/auth/model/types';
import type { DashboardMenu } from '@/features/dashboard/model/types';

export function buildDashboardMenus(role?: UserRole): DashboardMenu[] {
  const menus: DashboardMenu[] = [];

  if (canAccessDashboard(role)) {
    menus.push({ label: '대시보드', description: '요약 현황', href: '/' });
  }

  if (canViewStock(role)) {
    menus.push({ label: '재고 조회', description: '재고·로트 현황', href: '/stocks' });
  }
  if (canEditStock(role)) {
    menus.push({ label: '재고 관리', description: '재고 수정·조정', href: '/stocks/manage' });
  }
  menus.push(
    { label: '출고', description: '오더·피킹·배송', href: '/outbound' },
    { label: '반품', description: '접수·결정·처리', href: '/returns' },
  );

  if (canAccessTemperatureMonitor(role)) {
    menus.push({
      label: '온도 모니터',
      description: '날씨·COOL/FRZ 온도 체크',
      href: '/temperature-monitor',
    });
  }

  if (canAccessInbound(role)) {
    menus.splice(1, 0, {
      label: '입고',
      description: '업로드·확정',
      href: '/inbound',
    });
    menus.splice(2, 0, {
      label: '품목',
      description: '품목 마스터',
      href: '/items',
    });
  }

  if (canAccessAsn(role)) {
    menus.push({
      label: '입고 예정',
      description: '지사 간 입고 신청·관리',
      href: '/asn',
    });
  }

  if (canAccessTransfers(role)) {
    menus.push({
      label: '창고 간 이동',
      description: '지사별 창고 간 재고 이동',
      href: '/transfers',
    });
  }

  if (canAccessBranches(role)) {
    menus.push({
      label: '지사',
      description: '지사·창고 계층 관리',
      href: '/branches',
    });
  }

  if (canAccessCustomers(role)) {
    menus.push({
      label: '고객사',
      description: '고객사 관리',
      href: '/customers',
    });
  }

  if (canAccessCost(role)) {
    menus.push({
      label: '비용/원가',
      description: '원가 관리·리포트',
      href: '/cost',
    });
  }

  if (role === 'ADMIN') {
    menus.push(
      {
        label: '회원 승인',
        description: '가입 승인',
        href: '/approvals',
      },
      {
        label: '회원 관리',
        description: '멤버 관리',
        href: '/members',
      },
    );
  }

  return menus;
}
