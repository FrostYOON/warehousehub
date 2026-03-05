'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthSession } from '@/features/auth';
import {
  activateCustomer,
  createCustomer,
  deactivateCustomer,
  listCustomers,
  updateCustomer,
} from '@/features/customers/api/customers.api';
import type { Customer, CreateCustomerPayload } from '@/features/customers/model/types';
import { buildDashboardMenus, DashboardShell } from '@/features/dashboard';
import { COUNTRY_OPTIONS, getCountryLabel } from '@/shared/constants';
import { getPostalCodeInfo, validatePostalCode } from '@/shared/utils/postal-code';
import { useToast } from '@/shared/ui/toast/toast-provider';

const INIT_FORM: CreateCustomerPayload & Record<string, string> = {
  customerName: '',
  customerAddress: '',
  postalCode: '',
  city: '',
  state: '',
  country: '',
};

export default function CustomersPage() {
  const router = useRouter();
  const { me, loggingOut, signOut } = useAuthSession();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterIsActive, setFilterIsActive] = useState<string>('all');
  const [actionId, setActionId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState(INIT_FORM);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState(INIT_FORM);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const canAccess = me?.role === 'ADMIN' || me?.role === 'WH_MANAGER';

  useEffect(() => {
    if (me && !canAccess) {
      router.replace('/');
    }
  }, [me, canAccess, router]);

  useEffect(() => {
    if (!canAccess) return;
    const params: { q?: string; includeInactive?: boolean; isActive?: boolean } =
      {};
    if (search.trim()) params.q = search.trim();
    if (filterIsActive === 'all') params.includeInactive = true;
    else if (filterIsActive === 'true') params.isActive = true;
    else if (filterIsActive === 'false') params.isActive = false;

    let alive = true;
    setLoading(true);
    listCustomers(params)
      .then((data) => {
        if (alive) setCustomers(data);
      })
      .catch(() => {
        if (alive) showToast('고객사 목록을 불러오지 못했습니다.', 'error');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [canAccess, search, filterIsActive, showToast, refreshKey]);

  async function handleDeactivate(customer: Customer) {
    setActionId(customer.id);
    try {
      await deactivateCustomer(customer.id);
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customer.id ? { ...c, isActive: false } : c,
        ),
      );
      showToast(`${customer.customerName}을(를) 비활성화했습니다.`, 'success');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string | string[] } } })
              .response?.data?.message
          : null;
      const message = Array.isArray(msg) ? msg[0] : msg;
      showToast(message ?? '비활성화 처리에 실패했습니다.', 'error');
    } finally {
      setActionId(null);
    }
  }

  async function handleActivate(customer: Customer) {
    setActionId(customer.id);
    try {
      await activateCustomer(customer.id);
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customer.id ? { ...c, isActive: true } : c,
        ),
      );
      showToast(`${customer.customerName}을(를) 활성화했습니다.`, 'success');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string | string[] } } })
              .response?.data?.message
          : null;
      const message = Array.isArray(msg) ? msg[0] : msg;
      showToast(message ?? '활성화 처리에 실패했습니다.', 'error');
    } finally {
      setActionId(null);
    }
  }

  function openEditModal(c: Customer) {
    setEditCustomer(c);
    setEditForm({
      customerName: c.customerName,
      customerAddress: c.customerAddress,
      postalCode: c.postalCode ?? '',
      city: c.city ?? '',
      state: c.state ?? '',
      country: c.country ?? '',
    });
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (addSubmitting || !addForm.customerName.trim() || !addForm.customerAddress.trim())
      return;
    const pcValidation = validatePostalCode(
      addForm.postalCode ?? '',
      addForm.country ?? '',
    );
    if (!pcValidation.valid) {
      showToast(pcValidation.message ?? '올바른 형식이 아닙니다.', 'error');
      return;
    }
    setAddSubmitting(true);
    try {
      await createCustomer({
        customerName: addForm.customerName.trim(),
        customerAddress: addForm.customerAddress.trim(),
        ...((addForm.postalCode ?? '').trim() && {
          postalCode: (addForm.postalCode ?? '').trim(),
        }),
        ...((addForm.city ?? '').trim() && {
          city: (addForm.city ?? '').trim(),
        }),
        ...((addForm.state ?? '').trim() && {
          state: (addForm.state ?? '').trim(),
        }),
        ...((addForm.country ?? '').trim() && {
          country: (addForm.country ?? '').trim(),
        }),
      });
      setAddForm(INIT_FORM);
      setIsAddModalOpen(false);
      setRefreshKey((k) => k + 1);
      showToast('고객사가 추가되었습니다.', 'success');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string | string[] } } })
              .response?.data?.message
          : null;
      const message = Array.isArray(msg) ? msg[0] : msg;
      showToast(message ?? '고객사 추가에 실패했습니다.', 'error');
    } finally {
      setAddSubmitting(false);
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editCustomer || editSubmitting || !editForm.customerName.trim() || !editForm.customerAddress.trim())
      return;
    const pcValidation = validatePostalCode(
      editForm.postalCode ?? '',
      editForm.country ?? '',
    );
    if (!pcValidation.valid) {
      showToast(pcValidation.message ?? '올바른 형식이 아닙니다.', 'error');
      return;
    }
    setEditSubmitting(true);
    try {
      await updateCustomer(editCustomer.id, {
        customerName: editForm.customerName.trim(),
        customerAddress: editForm.customerAddress.trim(),
        postalCode: editForm.postalCode?.trim() ?? '',
        city: editForm.city?.trim() ?? '',
        state: editForm.state?.trim() ?? '',
        country: editForm.country?.trim() ?? '',
      });
      setEditCustomer(null);
      setRefreshKey((k) => k + 1);
      showToast('고객사가 수정되었습니다.', 'success');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string | string[] } } })
              .response?.data?.message
          : null;
      const message = Array.isArray(msg) ? msg[0] : msg;
      showToast(message ?? '고객사 수정에 실패했습니다.', 'error');
    } finally {
      setEditSubmitting(false);
    }
  }

  return (
    <DashboardShell
      userName={me?.name ?? '사용자'}
      companyName={me?.companyName ?? '회사'}
      onLogout={signOut}
      loggingOut={loggingOut}
      menus={buildDashboardMenus(me?.role)}
    >
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">고객사 관리</h2>
            <p className="text-xs text-slate-500">
              고객사 목록을 조회하고 등록·수정·비활성화할 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            고객사 추가
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <input
            type="search"
            placeholder="고객사명·주소·도시 등 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-56 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-400"
          />
          <select
            value={filterIsActive}
            onChange={(e) => setFilterIsActive(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-400"
          >
            <option value="all">전체 상태</option>
            <option value="true">활성</option>
            <option value="false">비활성</option>
          </select>
        </div>

        {loading && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            고객사 목록을 불러오는 중...
          </p>
        )}

        {!loading && customers.length === 0 && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            조건에 맞는 고객사가 없습니다.
          </p>
        )}

        {!loading && customers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="pb-2 pr-4">고객사명</th>
                  <th className="pb-2 pr-4">주소</th>
                  <th className="pb-2 pr-4">우편번호</th>
                  <th className="pb-2 pr-4">도시</th>
                  <th className="pb-2 pr-4">주/도</th>
                  <th className="pb-2 pr-4">국가</th>
                  <th className="pb-2 pr-4">상태</th>
                  <th className="pb-2">작업</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="py-3 pr-4 font-medium text-slate-800">
                      {c.customerName}
                    </td>
                    <td className="py-3 pr-4 text-slate-600">
                      {c.customerAddress}
                    </td>
                    <td className="py-3 pr-4 text-slate-600">
                      {c.postalCode ?? '-'}
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{c.city ?? '-'}</td>
                    <td className="py-3 pr-4 text-slate-600">{c.state ?? '-'}</td>
                    <td className="py-3 pr-4 text-slate-600">
                      {getCountryLabel(c.country)}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={
                          c.isActive
                            ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700'
                            : 'rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700'
                        }
                      >
                        {c.isActive ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(c)}
                          className="h-8 rounded border border-slate-300 px-2 text-xs hover:bg-slate-100"
                        >
                          수정
                        </button>
                        {c.isActive ? (
                          <button
                            type="button"
                            onClick={() => handleDeactivate(c)}
                            disabled={actionId === c.id}
                            className="h-8 rounded border border-slate-300 px-2 text-xs hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {actionId === c.id ? '처리 중...' : '비활성화'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleActivate(c)}
                            disabled={actionId === c.id}
                            className="h-8 rounded border border-slate-300 px-2 text-xs hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {actionId === c.id ? '처리 중...' : '활성화'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && customers.length > 0 && (
          <p className="mt-3 text-xs text-slate-500">
            총 {customers.length}건
          </p>
        )}

        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
              <h3 className="text-base font-semibold text-slate-800">
                고객사 추가
              </h3>
              <form onSubmit={handleAddSubmit} className="mt-3 space-y-3">
                <div>
                  <label
                    htmlFor="add-name"
                    className="block text-sm font-medium text-slate-700"
                  >
                    고객사명 *
                  </label>
                  <input
                    id="add-name"
                    type="text"
                    required
                    value={addForm.customerName}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, customerName: e.target.value }))
                    }
                    disabled={addSubmitting}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-400"
                    placeholder="(주)예시물류"
                  />
                </div>
                <div>
                  <label
                    htmlFor="add-address"
                    className="block text-sm font-medium text-slate-700"
                  >
                    주소 *
                  </label>
                  <input
                    id="add-address"
                    type="text"
                    required
                    value={addForm.customerAddress}
                    onChange={(e) =>
                      setAddForm((f) => ({
                        ...f,
                        customerAddress: e.target.value,
                      }))
                    }
                    disabled={addSubmitting}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-400"
                    placeholder="서울시 강남구 테헤란로 123"
                  />
                </div>
                <div>
                  <label
                    htmlFor="add-country"
                    className="block text-sm font-medium text-slate-700"
                  >
                    국가
                  </label>
                  <select
                    id="add-country"
                    value={addForm.country}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, country: e.target.value }))
                    }
                    disabled={addSubmitting}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-400"
                  >
                    {COUNTRY_OPTIONS.map((o) => (
                      <option key={o.value || 'empty'} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="add-postal"
                    className="block text-sm font-medium text-slate-700"
                  >
                    우편번호
                  </label>
                  <input
                    id="add-postal"
                    type="text"
                    value={addForm.postalCode}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, postalCode: e.target.value }))
                    }
                    disabled={addSubmitting}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-400"
                    placeholder={
                      getPostalCodeInfo(addForm.country)?.example ?? '06134'
                    }
                  />
                  {addForm.country && getPostalCodeInfo(addForm.country) && (
                    <p className="mt-1 text-xs text-slate-500">
                      {getPostalCodeInfo(addForm.country)!.hint}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="add-city"
                      className="block text-sm font-medium text-slate-700"
                    >
                      도시
                    </label>
                    <input
                      id="add-city"
                      type="text"
                      value={addForm.city}
                      onChange={(e) =>
                        setAddForm((f) => ({ ...f, city: e.target.value }))
                      }
                      disabled={addSubmitting}
                      className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-400"
                      placeholder="서울"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="add-state"
                      className="block text-sm font-medium text-slate-700"
                    >
                      주/도
                    </label>
                    <input
                      id="add-state"
                      type="text"
                      value={addForm.state}
                      onChange={(e) =>
                        setAddForm((f) => ({ ...f, state: e.target.value }))
                      }
                      disabled={addSubmitting}
                      className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-400"
                      placeholder="강남구"
                    />
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

        {editCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
              <h3 className="text-base font-semibold text-slate-800">
                고객사 수정 — {editCustomer.customerName}
              </h3>
              <form onSubmit={handleEditSubmit} className="mt-3 space-y-3">
                <div>
                  <label
                    htmlFor="edit-name"
                    className="block text-sm font-medium text-slate-700"
                  >
                    고객사명 *
                  </label>
                  <input
                    id="edit-name"
                    type="text"
                    required
                    value={editForm.customerName}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, customerName: e.target.value }))
                    }
                    disabled={editSubmitting}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-address"
                    className="block text-sm font-medium text-slate-700"
                  >
                    주소 *
                  </label>
                  <input
                    id="edit-address"
                    type="text"
                    required
                    value={editForm.customerAddress}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        customerAddress: e.target.value,
                      }))
                    }
                    disabled={editSubmitting}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-country"
                    className="block text-sm font-medium text-slate-700"
                  >
                    국가
                  </label>
                  <select
                    id="edit-country"
                    value={editForm.country}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, country: e.target.value }))
                    }
                    disabled={editSubmitting}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-400"
                  >
                    {COUNTRY_OPTIONS.map((o) => (
                      <option key={o.value || 'empty'} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="edit-postal"
                    className="block text-sm font-medium text-slate-700"
                  >
                    우편번호
                  </label>
                  <input
                    id="edit-postal"
                    type="text"
                    value={editForm.postalCode}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, postalCode: e.target.value }))
                    }
                    disabled={editSubmitting}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-400"
                    placeholder={
                      getPostalCodeInfo(editForm.country)?.example ?? '06134'
                    }
                  />
                  {editForm.country && getPostalCodeInfo(editForm.country) && (
                    <p className="mt-1 text-xs text-slate-500">
                      {getPostalCodeInfo(editForm.country)!.hint}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="edit-city"
                      className="block text-sm font-medium text-slate-700"
                    >
                      도시
                    </label>
                    <input
                      id="edit-city"
                      type="text"
                      value={editForm.city}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, city: e.target.value }))
                      }
                      disabled={editSubmitting}
                      className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="edit-state"
                      className="block text-sm font-medium text-slate-700"
                    >
                      주/도
                    </label>
                    <input
                      id="edit-state"
                      type="text"
                      value={editForm.state}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, state: e.target.value }))
                      }
                      disabled={editSubmitting}
                      className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-400"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditCustomer(null)}
                    disabled={editSubmitting}
                    className="h-9 rounded-lg border border-slate-300 px-3 text-sm hover:bg-slate-100 disabled:opacity-50"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="h-9 rounded-lg bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {editSubmitting ? '수정 중...' : '수정'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
