import {
  canAccessCustomers,
  canAccessInbound,
} from '@/features/auth/model/role-policy';
import type { UserRole } from '@/features/auth/model/types';
import type { DashboardMenu } from '@/features/dashboard/model/types';

export function buildDashboardMenus(role?: UserRole): DashboardMenu[] {
  const menus: DashboardMenu[] = [
    { label: '대시보드', description: '요약 현황', href: '/' },
    { label: '재고', description: '현재 재고/로트 현황', href: '/stocks' },
    { label: '출고', description: '오더/피킹/배송 관리', href: '/outbound' },
    { label: '반품', description: '접수/결정/처리 관리', href: '/returns' },
    { label: '내 계정', description: '내 계정 정보 확인', href: '/account' },
  ];

  if (canAccessInbound(role)) {
    menus.splice(2, 0, {
      label: '입고',
      description: '업로드/확정 관리',
      href: '/inbound',
    });
  }

  if (canAccessCustomers(role)) {
    menus.push({
      label: '고객사',
      description: '고객사 목록/등록/수정/비활성화',
      href: '/customers',
    });
  }

  if (role === 'ADMIN') {
    menus.push(
      {
        label: '회원 승인',
        description: '회원가입 신청 승인',
        href: '/approvals',
      },
      {
        label: '회원 관리',
        description: '회사 멤버 목록/역할/비활성화',
        href: '/members',
      },
    );
  }

  return menus;
}
