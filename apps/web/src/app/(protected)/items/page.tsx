'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthSession } from '@/features/auth';
import {
  activateItem,
  createItem,
  deactivateItem,
  listItems,
  updateItem,
} from '@/features/items/api/items.api';
import type {
  Item,
  CreateItemPayload,
  UpdateItemPayload,
} from '@/features/items/model/types';
import { useToast } from '@/shared/ui/toast/toast-provider';
import { getErrorMessage } from '@/shared/utils/get-error-message';
const INIT_FORM: CreateItemPayload = {
  itemCode: '',
  itemName: '',
};

export default function ItemsPage() {
  const router = useRouter();
  const { me } = useAuthSession();
  const { showToast } = useToast();

  const canAccess = me?.role === 'ADMIN' || me?.role === 'WH_MANAGER';

  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterIsActive, setFilterIsActive] = useState<string>('all');
  const [actionId, setActionId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState(INIT_FORM);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [editForm, setEditForm] = useState<UpdateItemPayload>({});
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    if (me && !canAccess) {
      router.replace('/stocks');
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
    listItems(params)
      .then((data) => {
        if (alive) {
          setItems(data.items);
          setTotal(data.total);
        }
      })
      .catch(() => {
        if (alive) showToast('품목 목록을 불러오지 못했습니다.', 'error');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [canAccess, search, filterIsActive, showToast, refreshKey]);

  async function handleDeactivate(item: Item) {
    setActionId(item.id);
    try {
      await deactivateItem(item.id);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isActive: false } : i)),
      );
      showToast(`${item.itemName}을(를) 비활성화했습니다.`, 'success');
    } catch (err: unknown) {
      showToast(
        getErrorMessage(err, '비활성화 처리에 실패했습니다.'),
        'error',
      );
    } finally {
      setActionId(null);
    }
  }

  async function handleActivate(item: Item) {
    setActionId(item.id);
    try {
      await activateItem(item.id);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isActive: true } : i)),
      );
      showToast(`${item.itemName}을(를) 활성화했습니다.`, 'success');
    } catch (err: unknown) {
      showToast(
        getErrorMessage(err, '활성화 처리에 실패했습니다.'),
        'error',
      );
    } finally {
      setActionId(null);
    }
  }

  function openEditModal(item: Item) {
    setEditItem(item);
    setEditForm({
      itemCode: item.itemCode,
      itemName: item.itemName,
    });
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      addSubmitting ||
      !addForm.itemCode.trim() ||
      !addForm.itemName.trim()
    )
      return;
    setAddSubmitting(true);
    try {
      await createItem({
        itemCode: addForm.itemCode.trim(),
        itemName: addForm.itemName.trim(),
      });
      setAddForm(INIT_FORM);
      setIsAddModalOpen(false);
      setRefreshKey((k) => k + 1);
      showToast('품목이 추가되었습니다.', 'success');
    } catch (err: unknown) {
      showToast(getErrorMessage(err, '품목 추가에 실패했습니다.'), 'error');
    } finally {
      setAddSubmitting(false);
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !editItem ||
      editSubmitting ||
      !editForm.itemCode?.trim() ||
      !editForm.itemName?.trim()
    )
      return;
    setEditSubmitting(true);
    try {
      await updateItem(editItem.id, {
        itemCode: editForm.itemCode.trim(),
        itemName: editForm.itemName.trim(),
      });
      setEditItem(null);
      setRefreshKey((k) => k + 1);
      showToast('품목이 수정되었습니다.', 'success');
    } catch (err: unknown) {
      showToast(getErrorMessage(err, '품목 수정에 실패했습니다.'), 'error');
    } finally {
      setEditSubmitting(false);
    }
  }

  return (
    <section className="page-section">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="page-title">품목 관리</h2>
            <p className="page-description">
              품목(마스터) 목록을 조회하고 등록·수정·비활성화할 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            품목 추가
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <input
            type="search"
            placeholder="품목 코드·품목명 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input h-9 w-56"
            aria-label="품목 검색"
          />
          <select
            value={filterIsActive}
            onChange={(e) => setFilterIsActive(e.target.value)}
            className="form-select h-9"
            aria-label="상태 필터"
          >
            <option value="all">전체 상태</option>
            <option value="true">활성</option>
            <option value="false">비활성</option>
          </select>
        </div>

        {loading && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            품목 목록을 불러오는 중...
          </p>
        )}

        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-6 py-12 text-center">
            <p className="text-sm text-slate-600">
              조건에 맞는 품목이 없습니다.
            </p>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              첫 품목 추가하기
            </button>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="table-wrapper">
            <table className="data-table min-w-[480px]">
              <thead>
                <tr>
                  <th>품목 코드</th>
                  <th>품목명</th>
                  <th>상태</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="font-mono text-slate-600">
                      {item.itemCode}
                    </td>
                    <td className="font-medium text-slate-800">
                      {item.itemName}
                    </td>
                    <td>
                      <span
                        className={
                          item.isActive
                            ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700'
                            : 'rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700'
                        }
                      >
                        {item.isActive ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="h-8 rounded border border-slate-300 px-2 text-xs hover:bg-slate-100"
                        >
                          수정
                        </button>
                        {item.isActive ? (
                          <button
                            type="button"
                            onClick={() => handleDeactivate(item)}
                            disabled={actionId === item.id}
                            className="h-8 rounded border border-slate-300 px-2 text-xs hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {actionId === item.id ? '처리 중...' : '비활성화'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleActivate(item)}
                            disabled={actionId === item.id}
                            className="h-8 rounded border border-slate-300 px-2 text-xs hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {actionId === item.id ? '처리 중...' : '활성화'}
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

        {!loading && items.length > 0 && (
          <p className="mt-3 text-xs text-slate-500">총 {total}건</p>
        )}

        {isAddModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-item-title"
          >
            <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
              <h3 id="add-item-title" className="text-base font-semibold text-slate-800">
                품목 추가
              </h3>
              <form onSubmit={handleAddSubmit} className="mt-3 space-y-3">
                <div>
                  <label
                    htmlFor="add-item-code"
                    className="block text-sm font-medium text-slate-700"
                  >
                    품목 코드 *
                  </label>
                  <input
                    id="add-item-code"
                    type="text"
                    required
                    value={addForm.itemCode}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, itemCode: e.target.value }))
                    }
                    disabled={addSubmitting}
                    className="form-input mt-1"
                    placeholder="SKU-001"
                  />
                </div>
                <div>
                  <label
                    htmlFor="add-item-name"
                    className="block text-sm font-medium text-slate-700"
                  >
                    품목명 *
                  </label>
                  <input
                    id="add-item-name"
                    type="text"
                    required
                    value={addForm.itemName}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, itemName: e.target.value }))
                    }
                    disabled={addSubmitting}
                    className="form-input mt-1"
                    placeholder="예: 상품 A"
                  />
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

        {editItem && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-item-title"
          >
            <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
              <h3 id="edit-item-title" className="text-base font-semibold text-slate-800">
                품목 수정 — {editItem.itemName}
              </h3>
              <form onSubmit={handleEditSubmit} className="mt-3 space-y-3">
                <div>
                  <label
                    htmlFor="edit-item-code"
                    className="block text-sm font-medium text-slate-700"
                  >
                    품목 코드 *
                  </label>
                  <input
                    id="edit-item-code"
                    type="text"
                    required
                    value={editForm.itemCode ?? ''}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, itemCode: e.target.value }))
                    }
                    disabled={editSubmitting}
                    className="form-input mt-1"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-item-name"
                    className="block text-sm font-medium text-slate-700"
                  >
                    품목명 *
                  </label>
                  <input
                    id="edit-item-name"
                    type="text"
                    required
                    value={editForm.itemName ?? ''}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, itemName: e.target.value }))
                    }
                    disabled={editSubmitting}
                    className="form-input mt-1"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditItem(null)}
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
  );
}
