'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthSession } from '@/features/auth';
import {
  approveCompanyUser,
  bulkDeactivateCompanyUsers,
  bulkRoleCompanyUsers,
  createCompanyUser,
  deactivateCompanyUser,
  getCompanyUsers,
  getUserAuditLogs,
  updateCompanyUserDepartment,
  updateCompanyUserRole,
} from '@/features/auth/api/auth.api';
import type { ListCompanyUsersParams } from '@/features/auth/api/auth.api';
import type {
  CompanyUser,
  UserAuditLogItem,
  UserRole,
} from '@/features/auth/model/types';
import { useToast } from '@/shared/ui/toast/toast-provider';
import { getErrorMessage } from '@/shared/utils/get-error-message';
import {
  PASSWORD_REQUIREMENT_TEXT,
  validatePassword,
} from '@/shared/utils/validate-password';
import { listBranches } from '@/features/branches/api/branches.api';
import type { Branch } from '@/features/branches/model/types';

const SORT_BY_OPTIONS: { value: 'name' | 'email' | 'createdAt' | 'updatedAt'; label: string }[] = [
  { value: 'createdAt', label: '가입일' },
  { value: 'name', label: '이름' },
  { value: 'email', label: '이메일' },
  { value: 'updatedAt', label: '수정일' },
];

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: '관리자',
  WH_MANAGER: '창고관리자',
  DELIVERY: '배송',
  ACCOUNTING: '회계',
  SALES: '영업',
};

const ROLE_OPTIONS: UserRole[] = [
  'ADMIN',
  'WH_MANAGER',
  'DELIVERY',
  'ACCOUNTING',
  'SALES',
];

export default function MembersPage() {
  const router = useRouter();
  const { me } = useAuthSession();
  const { showToast } = useToast();

  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<string>('');
  const [filterIsActive, setFilterIsActive] = useState<string>('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'createdAt' | 'updatedAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [actionId, setActionId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    email: '',
    name: '',
    password: '',
    role: 'DELIVERY' as UserRole,
    departmentCode: '',
    supervisorId: '',
    branchIds: [] as string[],
  });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [isBulkRoleModalOpen, setIsBulkRoleModalOpen] = useState(false);
  const [bulkRoleValue, setBulkRoleValue] = useState<UserRole>('DELIVERY');
  const [auditLogUser, setAuditLogUser] = useState<CompanyUser | null>(null);
  const [auditLogs, setAuditLogs] = useState<UserAuditLogItem[]>([]);
  const [auditLogLoading, setAuditLogLoading] = useState(false);
  const [deptModalUser, setDeptModalUser] = useState<CompanyUser | null>(null);
  const [deptForm, setDeptForm] = useState<{
    departmentCode: string;
    supervisorId: string;
    branchIds: string[];
  }>({ departmentCode: '', supervisorId: '', branchIds: [] });
  const [deptSubmitting, setDeptSubmitting] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);

  const canSelectUser = (user: CompanyUser) =>
    user.id !== me?.id && user.role !== 'ADMIN';

  const selectedCount = selectedIds.size;

  useEffect(() => {
    if (me && me.role !== 'ADMIN') {
      router.replace('/');
    }
  }, [me, router]);

  useEffect(() => {
    if (me?.role === 'ADMIN') {
      listBranches()
        .then(setBranches)
        .catch(() => {});
    }
  }, [me?.role]);

  // 필터/검색/정렬 변경 시 1페이지로
  useEffect(() => {
    setPage(1);
  }, [filterRole, filterIsActive, search, sortBy, sortOrder]);

  useEffect(() => {
    if (me?.role !== 'ADMIN') return;
    const params: ListCompanyUsersParams = {
      page,
      limit,
      sortBy,
      sortOrder,
    };
    if (filterRole) params.role = filterRole;
    if (filterIsActive !== '') {
      params.isActive = filterIsActive === 'true';
    }
    if (search.trim()) params.search = search.trim();
    let alive = true;
    setLoading(true);
    getCompanyUsers(params)
      .then((data) => {
        if (alive) {
          setUsers(data.items);
          setTotal(data.total);
        }
      })
      .catch(() => {
        if (alive) showToast('회원 목록을 불러오지 못했습니다.', 'error');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [me?.role, page, limit, filterRole, filterIsActive, search, sortBy, sortOrder, showToast, refreshKey]);

  async function handleDeactivate(user: CompanyUser) {
    if (user.id === me?.id) {
      showToast('본인 계정은 비활성화할 수 없습니다.', 'error');
      return;
    }
    if (user.role === 'ADMIN') {
      showToast('관리자 계정은 비활성화할 수 없습니다.', 'error');
      return;
    }
    setActionId(user.id);
    try {
      await deactivateCompanyUser(user.id);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: false } : u)),
      );
      showToast(`${user.name}님을 비활성화했습니다.`, 'success');
    } catch (err: unknown) {
      showToast(
        getErrorMessage(err, '비활성화 처리에 실패했습니다.'),
        'error',
      );
    } finally {
      setActionId(null);
    }
  }

  async function handleActivate(user: CompanyUser) {
    setActionId(user.id);
    try {
      await approveCompanyUser(user.id);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: true } : u)),
      );
      showToast(`${user.name}님을 활성화했습니다.`, 'success');
    } catch {
      showToast('활성화 처리에 실패했습니다.', 'error');
    } finally {
      setActionId(null);
    }
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (addSubmitting || !addForm.email.trim() || !addForm.name.trim() || !addForm.password)
      return;
    const pwResult = validatePassword(addForm.password);
    if (!pwResult.valid) {
      showToast(pwResult.message, 'error');
      return;
    }
    setAddSubmitting(true);
    try {
      await createCompanyUser({
        email: addForm.email.trim(),
        name: addForm.name.trim(),
        password: addForm.password,
        role: addForm.role,
        departmentCode: addForm.departmentCode || undefined,
        supervisorId: addForm.supervisorId || undefined,
        branchIds: addForm.branchIds.length > 0 ? addForm.branchIds : undefined,
      });
      setAddForm({
        email: '',
        name: '',
        password: '',
        role: 'DELIVERY',
        departmentCode: '',
        supervisorId: '',
        branchIds: [],
      });
      setIsAddModalOpen(false);
      setRefreshKey((k) => k + 1);
      showToast('멤버가 추가되었습니다.', 'success');
    } catch (err: unknown) {
      showToast(getErrorMessage(err, '멤버 추가에 실패했습니다.'), 'error');
    } finally {
      setAddSubmitting(false);
    }
  }

  function toggleSelect(user: CompanyUser) {
    if (!canSelectUser(user)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(user.id)) next.delete(user.id);
      else next.add(user.id);
      return next;
    });
  }

  function toggleSelectAll() {
    const selectable = users.filter(canSelectUser);
    const allSelected = selectable.every((u) => selectedIds.has(u.id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        selectable.forEach((u) => next.delete(u.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        selectable.forEach((u) => next.add(u.id));
        return next;
      });
    }
  }

  async function handleBulkDeactivate() {
    if (selectedCount === 0) return;
    setBulkActionLoading(true);
    try {
      const result = await bulkDeactivateCompanyUsers([...selectedIds]);
      setSelectedIds(new Set());
      setRefreshKey((k) => k + 1);
      showToast(
        `${result.deactivated}명 비활성화${result.skipped > 0 ? ` (${result.skipped}명 제외)` : ''}`,
        'success',
      );
    } catch (err: unknown) {
      showToast(
        getErrorMessage(err, '일괄 비활성화에 실패했습니다.'),
        'error',
      );
    } finally {
      setBulkActionLoading(false);
    }
  }

  async function handleBulkRoleSubmit() {
    if (selectedCount === 0) return;
    setBulkActionLoading(true);
    try {
      const result = await bulkRoleCompanyUsers([...selectedIds], bulkRoleValue);
      setSelectedIds(new Set());
      setIsBulkRoleModalOpen(false);
      setRefreshKey((k) => k + 1);
      showToast(
        `${result.updated}명 역할 변경${result.skipped > 0 ? ` (${result.skipped}명 제외)` : ''}`,
        'success',
      );
    } catch (err: unknown) {
      showToast(
        getErrorMessage(err, '일괄 역할 변경에 실패했습니다.'),
        'error',
      );
    } finally {
      setBulkActionLoading(false);
    }
  }

  async function openAuditLog(user: CompanyUser) {
    setAuditLogUser(user);
    setAuditLogLoading(true);
    try {
      const data = await getUserAuditLogs(user.id);
      setAuditLogs(data.items);
    } catch {
      showToast('변경 이력을 불러오지 못했습니다.', 'error');
      setAuditLogs([]);
    } finally {
      setAuditLogLoading(false);
    }
  }

  function formatLastLogin(v: string | null | undefined) {
    if (!v) return '-';
    try {
      const d = new Date(v);
      return d.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  }

  function formatAuditAction(action: string) {
    const m: Record<string, string> = {
      ROLE_CHANGED: '역할 변경',
      ACTIVATED: '활성화',
      DEACTIVATED: '비활성화',
    };
    return m[action] ?? action;
  }

  function openDeptModal(user: CompanyUser) {
    setDeptModalUser(user);
    setDeptForm({
      departmentCode: user.departmentCode ?? '',
      supervisorId: user.supervisorId ?? '',
      branchIds: user.branchIds ?? [],
    });
  }

  async function handleDeptSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!deptModalUser || deptSubmitting) return;
    setDeptSubmitting(true);
    try {
      const updated = await updateCompanyUserDepartment(deptModalUser.id, {
        departmentCode: deptForm.departmentCode || null,
        supervisorId: deptForm.supervisorId || null,
        branchIds: deptForm.branchIds,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === deptModalUser.id ? { ...u, ...updated } : u)),
      );
      setDeptModalUser(null);
      showToast('부서·관리자·담당 지사 설정을 저장했습니다.', 'success');
    } catch (err: unknown) {
      showToast(
        getErrorMessage(err, '설정 저장에 실패했습니다.'),
        'error',
      );
    } finally {
      setDeptSubmitting(false);
    }
  }

  function toggleBranch(branchId: string) {
    setDeptForm((f) => ({
      ...f,
      branchIds: f.branchIds.includes(branchId)
        ? f.branchIds.filter((id) => id !== branchId)
        : [...f.branchIds, branchId],
    }));
  }

  function toggleAddBranch(branchId: string) {
    setAddForm((f) => ({
      ...f,
      branchIds: f.branchIds.includes(branchId)
        ? f.branchIds.filter((id) => id !== branchId)
        : [...f.branchIds, branchId],
    }));
  }

  async function handleRoleChange(user: CompanyUser, newRole: UserRole) {
    if (user.role === newRole) return;
    if (user.id === me?.id && newRole !== 'ADMIN') {
      showToast('본인 역할에서 관리자를 제거할 수 없습니다.', 'error');
      return;
    }
    setActionId(user.id);
    try {
      await updateCompanyUserRole(user.id, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)),
      );
      showToast(`${user.name}님의 역할을 변경했습니다.`, 'success');
    } catch (err: unknown) {
      showToast(getErrorMessage(err, '역할 변경에 실패했습니다.'), 'error');
    } finally {
      setActionId(null);
    }
  }

  return (
    <section className="page-section">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="page-title">회원 관리</h2>
            <p className="page-description">
              같은 회사 소속 멤버를 조회하고 역할 변경, 비활성화할 수 있습니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedCount > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleBulkDeactivate}
                  disabled={bulkActionLoading}
                  className="h-9 rounded-lg border border-amber-300 bg-amber-50 px-3 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                >
                  {bulkActionLoading ? '처리 중...' : `선택 항목 비활성화 (${selectedCount})`}
                </button>
                <button
                  type="button"
                  onClick={() => setIsBulkRoleModalOpen(true)}
                  disabled={bulkActionLoading}
                  className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  선택 항목 역할 변경
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              멤버 추가
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <input
            type="search"
            placeholder="이름·이메일 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input h-9 w-44"
          />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="form-select h-9"
          >
            <option value="">전체 역할</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <select
            value={filterIsActive}
            onChange={(e) => setFilterIsActive(e.target.value)}
            className="form-select h-9"
          >
            <option value="">전체 상태</option>
            <option value="true">활성</option>
            <option value="false">비활성/승인대기</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as 'name' | 'email' | 'createdAt' | 'updatedAt')
            }
            className="form-select h-9"
          >
            {SORT_BY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            className="form-select h-9"
          >
            <option value="desc">내림차순</option>
            <option value="asc">오름차순</option>
          </select>
        </div>

        {loading && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            회원 목록을 불러오는 중...
          </p>
        )}

        {!loading && users.length === 0 && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            조건에 맞는 회원이 없습니다.
          </p>
        )}

        {!loading && users.length > 0 && (
          <div className="table-wrapper">
            <table className="data-table min-w-[680px]">
              <thead>
                <tr>
                  <th className="w-10">
                    {users.some(canSelectUser) && (
                      <input
                        type="checkbox"
                        checked={
                          users.filter(canSelectUser).length > 0 &&
                          users.filter(canSelectUser).every((u) => selectedIds.has(u.id))
                        }
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    )}
                  </th>
                  <th>이름</th>
                  <th>이메일</th>
                  <th>역할</th>
                  <th>부서</th>
                  <th>관리자</th>
                  <th>담당 지사</th>
                  <th>상태</th>
                  <th>마지막 로그인</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="w-10">
                      {canSelectUser(user) ? (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(user.id)}
                          onChange={() => toggleSelect(user)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                      ) : null}
                    </td>
                    <td className="font-medium text-slate-800">
                      {user.name}
                    </td>
                    <td className="text-slate-600">{user.email}</td>
                    <td>
                      <select
                        value={user.role}
                        onChange={(e) =>
                          handleRoleChange(
                            user,
                            e.target.value as UserRole,
                          )
                        }
                        disabled={actionId === user.id || user.id === me?.id}
                        className="form-select h-8 px-2 text-xs disabled:cursor-not-allowed"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="text-xs text-slate-600">
                      {user.departmentCode ?? '-'}
                    </td>
                    <td className="text-xs text-slate-600">
                      {user.supervisor?.name ?? '-'}
                    </td>
                    <td className="max-w-[120px] truncate text-xs text-slate-600">
                      {user.branches?.length
                        ? user.branches.map((b) => b.name).join(', ')
                        : '전체'}
                    </td>
                    <td>
                      <span
                        className={
                          user.isActive
                            ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700'
                            : 'rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700'
                        }
                      >
                        {user.isActive ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-500">
                      {formatLastLogin(user.lastLoginAt)}
                    </td>
                    <td>
                      <div className="flex flex-wrap items-center gap-1">
                      {user.isActive ? (
                        <button
                          type="button"
                          onClick={() => handleDeactivate(user)}
                          disabled={
                            actionId === user.id ||
                            user.id === me?.id ||
                            user.role === 'ADMIN'
                          }
                          className="h-8 rounded border border-slate-300 px-2 text-xs hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {actionId === user.id ? '처리 중...' : '비활성화'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleActivate(user)}
                          disabled={actionId === user.id}
                          className="h-8 rounded border border-slate-300 px-2 text-xs hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {actionId === user.id ? '처리 중...' : '활성화'}
                        </button>
                      )}
                        <button
                          type="button"
                          onClick={() => openDeptModal(user)}
                          className="h-8 rounded border border-slate-200 px-2 text-xs text-slate-600 hover:bg-slate-50"
                        >
                          부서/지사
                        </button>
                        <button
                          type="button"
                          onClick={() => openAuditLog(user)}
                          className="h-8 rounded border border-slate-200 px-2 text-xs text-slate-600 hover:bg-slate-50"
                        >
                          변경 이력
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && total > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              {(page - 1) * limit + 1}–
              {Math.min(page * limit, total)} / {total}명
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-8 rounded border border-slate-300 px-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
              >
                이전
              </button>
              <span className="px-2 text-sm text-slate-600">
                {page} / {Math.max(1, Math.ceil(total / limit))}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPage((p) =>
                    Math.min(Math.ceil(total / limit), p + 1),
                  )
                }
                disabled={page >= Math.ceil(total / limit)}
                className="h-8 rounded border border-slate-300 px-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
              >
                다음
              </button>
            </div>
          </div>
        )}

        <p className="mt-3 text-xs text-slate-500">
          비활성화된 계정은 로그인할 수 없습니다.
        </p>

        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
              <h3 className="text-base font-semibold text-slate-800">멤버 추가</h3>
              <form onSubmit={handleAddSubmit} className="mt-3 space-y-3">
                <div>
                  <label htmlFor="add-email" className="block text-sm font-medium text-slate-700">
                    이메일
                  </label>
                  <input
                    id="add-email"
                    type="email"
                    required
                    value={addForm.email}
                    onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                    disabled={addSubmitting}
                    className="form-input mt-1"
                    placeholder="staff@example.com"
                  />
                </div>
                <div>
                  <label htmlFor="add-name" className="block text-sm font-medium text-slate-700">
                    이름
                  </label>
                  <input
                    id="add-name"
                    type="text"
                    required
                    value={addForm.name}
                    onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                    disabled={addSubmitting}
                    className="form-input mt-1"
                    placeholder="홍길동"
                  />
                </div>
                <div>
                  <label htmlFor="add-password" className="block text-sm font-medium text-slate-700">
                    비밀번호 ({PASSWORD_REQUIREMENT_TEXT})
                  </label>
                  <input
                    id="add-password"
                    type="password"
                    required
                    minLength={8}
                    value={addForm.password}
                    onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
                    disabled={addSubmitting}
                    className="form-input mt-1"
                    placeholder="비밀번호"
                  />
                </div>
                <div>
                  <label htmlFor="add-role" className="block text-sm font-medium text-slate-700">
                    역할
                  </label>
                  <select
                    id="add-role"
                    value={addForm.role}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, role: e.target.value as UserRole }))
                    }
                    disabled={addSubmitting}
                    className="form-select mt-1"
                  >
                    {ROLE_OPTIONS.filter((r) => r !== 'ADMIN').map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="add-dept" className="block text-sm font-medium text-slate-700">
                    부서 코드 (선택)
                  </label>
                  <input
                    id="add-dept"
                    type="text"
                    value={addForm.departmentCode}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, departmentCode: e.target.value }))
                    }
                    disabled={addSubmitting}
                    className="form-input mt-1"
                    placeholder="SALES, ACCOUNTING, WAREHOUSE, DELIVERY"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    상위 관리자 (선택)
                  </label>
                  <select
                    value={addForm.supervisorId}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, supervisorId: e.target.value }))
                    }
                    disabled={addSubmitting}
                    className="form-select mt-1"
                  >
                    <option value="">없음</option>
                    {users
                      .filter((u) => u.id !== me?.id && u.isActive)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    담당 지사 (선택, 비워두면 전체)
                  </label>
                  <div className="mt-1 max-h-32 overflow-y-auto rounded border border-slate-200 p-2">
                    {branches.length === 0 ? (
                      <p className="text-xs text-slate-500">지사가 없습니다.</p>
                    ) : (
                      <div className="space-y-1">
                        {branches.map((b) => (
                          <label key={b.id} className="flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={addForm.branchIds.includes(b.id)}
                              onChange={() => toggleAddBranch(b.id)}
                              className="h-3.5 w-3.5 rounded border-slate-300"
                            />
                            <span className="text-sm">{b.name}</span>
                            {b.code && (
                              <span className="text-xs text-slate-400">({b.code})</span>
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    disabled={addSubmitting}
                    className="h-9 rounded-lg border border-slate-300 px-3 text-sm hover:bg-slate-100 disabled:opacity-50"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={addSubmitting}
                    className="h-9 rounded-lg bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {addSubmitting ? '추가 중...' : '추가'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isBulkRoleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
              <h3 className="text-base font-semibold text-slate-800">
                선택 항목 역할 변경 ({selectedCount}명)
              </h3>
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    변경할 역할
                  </label>
                  <select
                    value={bulkRoleValue}
                    onChange={(e) =>
                      setBulkRoleValue(e.target.value as UserRole)
                    }
                    className="form-select mt-1"
                  >
                    {ROLE_OPTIONS.filter((r) => r !== 'ADMIN').map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsBulkRoleModalOpen(false)}
                    disabled={bulkActionLoading}
                    className="h-9 rounded-lg border border-slate-300 px-3 text-sm hover:bg-slate-100 disabled:opacity-50"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkRoleSubmit}
                    disabled={bulkActionLoading}
                    className="h-9 rounded-lg bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {bulkActionLoading ? '처리 중...' : '변경'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {deptModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
              <h3 className="text-base font-semibold text-slate-800">
                부서·관리자·담당 지사 — {deptModalUser.name}
              </h3>
              <form onSubmit={handleDeptSubmit} className="mt-3 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    부서 코드
                  </label>
                  <input
                    type="text"
                    value={deptForm.departmentCode}
                    onChange={(e) =>
                      setDeptForm((f) => ({ ...f, departmentCode: e.target.value }))
                    }
                    disabled={deptSubmitting}
                    className="form-input mt-1"
                    placeholder="SALES, ACCOUNTING, WAREHOUSE, DELIVERY"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    상위 관리자
                  </label>
                  <select
                    value={deptForm.supervisorId}
                    onChange={(e) =>
                      setDeptForm((f) => ({ ...f, supervisorId: e.target.value }))
                    }
                    disabled={deptSubmitting}
                    className="form-select mt-1"
                  >
                    <option value="">없음</option>
                    {users
                      .filter(
                        (u) =>
                          u.id !== deptModalUser.id &&
                          u.isActive,
                      )
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    담당 지사 (비워두면 전체)
                  </label>
                  <div className="mt-1 max-h-32 overflow-y-auto rounded border border-slate-200 p-2">
                    {branches.length === 0 ? (
                      <p className="text-xs text-slate-500">지사가 없습니다.</p>
                    ) : (
                      <div className="space-y-1">
                        {branches.map((b) => (
                          <label key={b.id} className="flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={deptForm.branchIds.includes(b.id)}
                              onChange={() => toggleBranch(b.id)}
                              className="h-3.5 w-3.5 rounded border-slate-300"
                            />
                            <span className="text-sm">{b.name}</span>
                            {b.code && (
                              <span className="text-xs text-slate-400">({b.code})</span>
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeptModalUser(null)}
                    disabled={deptSubmitting}
                    className="h-9 rounded-lg border border-slate-300 px-3 text-sm hover:bg-slate-100 disabled:opacity-50"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={deptSubmitting}
                    className="h-9 rounded-lg bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {deptSubmitting ? '저장 중...' : '저장'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {auditLogUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              <div className="border-b border-slate-200 px-4 py-3">
                <h3 className="text-base font-semibold text-slate-800">
                  변경 이력 — {auditLogUser.name}
                </h3>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-4">
                {auditLogLoading && (
                  <p className="text-sm text-slate-500">불러오는 중...</p>
                )}
                {!auditLogLoading && auditLogs.length === 0 && (
                  <p className="text-sm text-slate-500">변경 이력이 없습니다.</p>
                )}
                {!auditLogLoading && auditLogs.length > 0 && (
                  <ul className="space-y-3">
                    {auditLogs.map((log) => (
                      <li
                        key={log.id}
                        className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-700">
                            {formatAuditAction(log.action)}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(log.createdAt).toLocaleString('ko-KR')}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          처리: {log.actorUser.name} ({log.actorUser.email})
                        </p>
                        {(log.beforeValue || log.afterValue) && (
                          <p className="mt-1 text-xs text-slate-500">
                            {log.beforeValue && `이전: ${log.beforeValue} → `}
                            {log.afterValue && `이후: ${log.afterValue}`}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="border-t border-slate-200 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setAuditLogUser(null)}
                  className="h-9 rounded-lg border border-slate-300 px-3 text-sm hover:bg-slate-50"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
  );
}
