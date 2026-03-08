'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthSession } from '@/features/auth';
import {
  useBranchesQuery,
  useCreateBranchMutation,
} from '@/features/branches';
import type { CreateBranchPayload } from '@/features/branches';
import { useToast } from '@/shared/ui/toast/toast-provider';
import { getErrorMessage } from '@/shared/utils/get-error-message';

const INIT_FORM: CreateBranchPayload & Record<string, string> = {
  name: '',
  code: '',
};

export default function BranchesPage() {
  const router = useRouter();
  const { me } = useAuthSession();
  const { showToast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState(INIT_FORM);

  const canAccess = me?.role === 'ADMIN' || me?.role === 'WH_MANAGER';

  const { branches, loading } = useBranchesQuery(canAccess ?? false);
  const createMutation = useCreateBranchMutation();

  useEffect(() => {
    if (me && !canAccess) {
      router.replace('/');
    }
  }, [me, canAccess, router]);

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      createMutation.isPending ||
      !addForm.name.trim()
    )
      return;
    try {
      const code = (addForm.code ?? '').trim();
      await createMutation.mutateAsync({
        name: addForm.name.trim(),
        ...(code && { code }),
      });
      setAddForm(INIT_FORM);
      setIsAddModalOpen(false);
      showToast('지사가 추가되었습니다.', 'success');
    } catch (err: unknown) {
      showToast(getErrorMessage(err, '지사 추가에 실패했습니다.'), 'error');
    }
  }

  return (
    <section className="page-section">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="page-title">지사 관리</h2>
          <p className="page-description">
            Company → Branch → Warehouse 계층 구조에서 지사(브랜치)를 관리합니다.
          </p>
        </div>
        {canAccess && (
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            지사 추가
          </button>
        )}
      </div>

      {loading && (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          지사 목록을 불러오는 중...
        </p>
      )}

      {!loading && branches.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-6 py-12 text-center">
          <p className="text-sm text-slate-600">등록된 지사가 없습니다.</p>
          {canAccess && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              첫 지사 추가하기
            </button>
          )}
        </div>
      )}

      {!loading && branches.length > 0 && (
        <div className="table-wrapper">
          <table className="data-table min-w-[480px]">
            <thead>
              <tr>
                <th>지사명</th>
                <th>코드</th>
                <th>창고 수</th>
                <th>등록일</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id}>
                  <td className="font-medium text-slate-800">{b.name}</td>
                  <td className="text-slate-600">{b.code ?? '-'}</td>
                  <td className="text-slate-600">
                    {b._count?.warehouses ?? 0}개
                  </td>
                  <td className="text-slate-600">
                    {b.createdAt
                      ? new Date(b.createdAt).toLocaleDateString('ko-KR')
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && branches.length > 0 && (
        <p className="mt-3 text-xs text-slate-500">총 {branches.length}건</p>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
            <h3 className="text-base font-semibold text-slate-800">지사 추가</h3>
            <form onSubmit={handleAddSubmit} className="mt-3 space-y-3">
              <div>
                <label
                  htmlFor="add-name"
                  className="block text-sm font-medium text-slate-700"
                >
                  지사명 *
                </label>
                <input
                  id="add-name"
                  type="text"
                  required
                  value={addForm.name}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, name: e.target.value }))
                  }
                  disabled={createMutation.isPending}
                  className="form-input mt-1"
                  placeholder="토론토, 몬트리올 등"
                />
              </div>
              <div>
                <label
                  htmlFor="add-code"
                  className="block text-sm font-medium text-slate-700"
                >
                  지사 코드 (선택)
                </label>
                <input
                  id="add-code"
                  type="text"
                  value={addForm.code}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, code: e.target.value }))
                  }
                  disabled={createMutation.isPending}
                  className="form-input mt-1"
                  placeholder="TOR, MTL 등"
                />
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
    </section>
  );
}
