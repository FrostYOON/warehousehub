'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthSession } from '@/features/auth';
import { useCustomersQuery } from '@/features/customers/hooks/use-customers-query';
import type { Customer, CreateCustomerPayload } from '@/features/customers/model/types';
import { COUNTRY_OPTIONS, getCountryLabel } from '@/shared/constants';
import { getPostalCodeInfo, validatePostalCode } from '@/shared/utils/postal-code';
import { useToast } from '@/shared/ui/toast/toast-provider';
import { getErrorMessage } from '@/shared/utils/get-error-message';

const INIT_FORM: CreateCustomerPayload & Record<string, string> = {
  customerCode: '',
  customerName: '',
  customerAddress: '',
  postalCode: '',
  city: '',
  state: '',
  country: '',
};

export default function CustomersPage() {
  const router = useRouter();
  const { me } = useAuthSession();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [filterIsActive, setFilterIsActive] = useState<string>('all');
  const [actionId, setActionId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState(INIT_FORM);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState(INIT_FORM);

  const canAccess = me?.role === 'ADMIN' || me?.role === 'WH_MANAGER';

  const {
    items: customers,
    total,
    loading,
    createMutation,
    updateMutation,
    deactivateMutation,
    activateMutation,
  } = useCustomersQuery({
    q: search,
    filterIsActive,
    enabled: canAccess ?? false,
  });

  useEffect(() => {
    if (me && !canAccess) {
      router.replace('/');
    }
  }, [me, canAccess, router]);

  async function handleDeactivate(customer: Customer) {
    setActionId(customer.id);
    try {
      await deactivateMutation.mutateAsync(customer.id);
      showToast(`${customer.customerName}을(를) 비활성화했습니다.`, 'success');
    } catch (err: unknown) {
      showToast(
        getErrorMessage(err, '비활성화 처리에 실패했습니다.'),
        'error',
      );
    } finally {
      setActionId(null);
    }
  }

  async function handleActivate(customer: Customer) {
    setActionId(customer.id);
    try {
      await activateMutation.mutateAsync(customer.id);
      showToast(`${customer.customerName}을(를) 활성화했습니다.`, 'success');
    } catch (err: unknown) {
      showToast(
        getErrorMessage(err, '활성화 처리에 실패했습니다.'),
        'error',
      );
    } finally {
      setActionId(null);
    }
  }

  function openEditModal(c: Customer) {
    setEditCustomer(c);
    setEditForm({
      customerCode: c.customerCode ?? '',
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
    if (createMutation.isPending || !addForm.customerName.trim() || !addForm.customerAddress.trim())
      return;
    const pcValidation = validatePostalCode(
      addForm.postalCode ?? '',
      addForm.country ?? '',
    );
    if (!pcValidation.valid) {
      showToast(pcValidation.message ?? '올바른 형식이 아닙니다.', 'error');
      return;
    }
    try {
      await createMutation.mutateAsync({
        ...((addForm.customerCode ?? '').trim() && {
          customerCode: (addForm.customerCode ?? '').trim(),
        }),
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
      showToast('고객사가 추가되었습니다.', 'success');
    } catch (err: unknown) {
      showToast(getErrorMessage(err, '고객사 추가에 실패했습니다.'), 'error');
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editCustomer || updateMutation.isPending || !editForm.customerName.trim() || !editForm.customerAddress.trim())
      return;
    const pcValidation = validatePostalCode(
      editForm.postalCode ?? '',
      editForm.country ?? '',
    );
    if (!pcValidation.valid) {
      showToast(pcValidation.message ?? '올바른 형식이 아닙니다.', 'error');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: editCustomer.id,
        payload: {
          customerCode: (editForm.customerCode ?? '').trim(),
          customerName: editForm.customerName.trim(),
          customerAddress: editForm.customerAddress.trim(),
          postalCode: editForm.postalCode?.trim() ?? '',
          city: editForm.city?.trim() ?? '',
          state: editForm.state?.trim() ?? '',
          country: editForm.country?.trim() ?? '',
        },
      });
      setEditCustomer(null);
      showToast('고객사가 수정되었습니다.', 'success');
    } catch (err: unknown) {
      showToast(getErrorMessage(err, '고객사 수정에 실패했습니다.'), 'error');
    }
  }

  return (
    <section className="page-section">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="page-title">고객사 관리</h2>
            <p className="page-description">
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
            placeholder="코드·고객사명·주소·도시 등 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input h-9 w-56"
          />
          <select
            value={filterIsActive}
            onChange={(e) => setFilterIsActive(e.target.value)}
            className="form-select h-9"
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
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-6 py-12 text-center">
            <p className="text-sm text-slate-600">
              조건에 맞는 고객사가 없습니다.
            </p>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              첫 고객사 추가하기
            </button>
          </div>
        )}

        {!loading && customers.length > 0 && (
          <div className="table-wrapper">
            <table className="data-table min-w-[720px]">
              <thead>
                <tr>
                  <th>코드</th>
                  <th>고객사명</th>
                  <th>주소</th>
                  <th>우편번호</th>
                  <th>도시</th>
                  <th>주/도</th>
                  <th>국가</th>
                  <th>상태</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td className="text-slate-600">
                      {c.customerCode ?? '-'}
                    </td>
                    <td className="font-medium text-slate-800">
                      {c.customerName}
                    </td>
                    <td className="text-slate-600">
                      {c.customerAddress}
                    </td>
                    <td className="text-slate-600">
                      {c.postalCode ?? '-'}
                    </td>
                    <td className="text-slate-600">{c.city ?? '-'}</td>
                    <td className="text-slate-600">{c.state ?? '-'}</td>
                    <td className="text-slate-600">
                      {getCountryLabel(c.country)}
                    </td>
                    <td>
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
                    <td>
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
            총 {total}건
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
                    htmlFor="add-code"
                    className="block text-sm font-medium text-slate-700"
                  >
                    고객사 코드
                  </label>
                  <input
                    id="add-code"
                    type="text"
                    value={addForm.customerCode}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, customerCode: e.target.value }))
                    }
                    disabled={createMutation.isPending}
                    className="form-input mt-1"
                    placeholder="ERP 코드 등 (선택)"
                  />
                </div>
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
                    disabled={createMutation.isPending}
                    className="form-input mt-1"
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
                    disabled={createMutation.isPending}
                    className="form-input mt-1"
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
                    disabled={createMutation.isPending}
                    className="form-select mt-1"
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
                    disabled={createMutation.isPending}
                    className="form-input mt-1"
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
                      disabled={createMutation.isPending}
                      className="form-input mt-1"
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
                      disabled={createMutation.isPending}
                      className="form-input mt-1"
                      placeholder="강남구"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    disabled={createMutation.isPending}
                    className="h-9 rounded-lg border border-slate-300 px-3 text-sm hover:bg-slate-100 disabled:opacity-50"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="h-9 rounded-lg bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {createMutation.isPending ? '추가 중...' : '추가'}
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
                    htmlFor="edit-code"
                    className="block text-sm font-medium text-slate-700"
                  >
                    고객사 코드
                  </label>
                  <input
                    id="edit-code"
                    type="text"
                    value={editForm.customerCode}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, customerCode: e.target.value }))
                    }
                    disabled={updateMutation.isPending}
                    className="form-input mt-1"
                    placeholder="ERP 코드 등 (선택)"
                  />
                </div>
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
                    disabled={updateMutation.isPending}
                    className="form-input mt-1"
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
                    disabled={updateMutation.isPending}
                    className="form-input mt-1"
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
                    disabled={updateMutation.isPending}
                    className="form-select mt-1"
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
                    disabled={updateMutation.isPending}
                    className="form-input mt-1"
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
                      disabled={updateMutation.isPending}
                      className="form-input mt-1"
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
                      disabled={updateMutation.isPending}
                      className="form-input mt-1"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditCustomer(null)}
                    disabled={updateMutation.isPending}
                    className="h-9 rounded-lg border border-slate-300 px-3 text-sm hover:bg-slate-100 disabled:opacity-50"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="h-9 rounded-lg bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {updateMutation.isPending ? '수정 중...' : '수정'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>
  );
}
