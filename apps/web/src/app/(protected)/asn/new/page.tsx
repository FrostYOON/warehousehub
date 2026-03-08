'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { listBranches } from '@/features/branches/api/branches.api';
import { createAsn } from '@/features/asn/api/asn.api';
import { listItems } from '@/features/items/api/items.api';
import { httpClient } from '@/shared/api/http-client';
import type { CreateAsnPayload } from '@/features/asn/model/types';
import type { Branch } from '@/features/branches/model/types';
import { useToast } from '@/shared/ui/toast/toast-provider';
import { getErrorMessage } from '@/shared/utils/get-error-message';

type WarehouseWithBranch = {
  id: string;
  name: string;
  type: string;
  branchId: string;
  branch: { id: string; name: string };
};

export default function AsnNewPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseWithBranch[]>([]);
  const [items, setItems] = useState<Array<{ id: string; itemCode: string; itemName: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [toBranchId, setToBranchId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [fromBranchId, setFromBranchId] = useState('');
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [expectedDate, setExpectedDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [lines, setLines] = useState<Array<{ itemId: string; quantity: number; expiryDate?: string }>>([
    { itemId: '', quantity: 0 },
  ]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [branchesRes, warehousesRes, itemsRes] = await Promise.all([
          listBranches(),
          httpClient.get<WarehouseWithBranch[]>('/warehouses'),
          listItems({ pageSize: 500 }),
        ]);
        setBranches(branchesRes);
        setWarehouses(warehousesRes.data);
        setItems(itemsRes.items);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const toWarehouses = warehouses.filter((w) => w.branchId === toBranchId);
  const fromWarehouses = warehouses.filter((w) => w.branchId === fromBranchId);

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, { itemId: '', quantity: 0 }]);
  }, []);

  const updateLine = useCallback(
    (idx: number, field: 'itemId' | 'quantity' | 'expiryDate', value: string | number) => {
      setLines((prev) => {
        const next = [...prev];
        (next[idx] as Record<string, unknown>)[field] = value;
        return next;
      });
    },
    [],
  );

  const removeLine = useCallback((idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!toBranchId || !toWarehouseId) {
        showToast('도착 지사와 창고를 선택해주세요.', 'error');
        return;
      }
      const validLines = lines.filter((l) => l.itemId && l.quantity > 0);
      if (validLines.length === 0) {
        showToast('품목을 1건 이상 추가해주세요.', 'error');
        return;
      }

      setSubmitting(true);
      try {
        const payload: CreateAsnPayload = {
          toBranchId,
          toWarehouseId,
          expectedDate: `${expectedDate}T12:00:00.000Z`,
          lines: validLines.map((l) => ({
            itemId: l.itemId,
            quantity: l.quantity,
            ...(l.expiryDate && { expiryDate: `${l.expiryDate}T00:00:00.000Z` }),
          })),
        };
        if (fromBranchId && fromWarehouseId) {
          payload.fromBranchId = fromBranchId;
          payload.fromWarehouseId = fromWarehouseId;
        }
        await createAsn(payload);
        showToast('입고 예정이 등록되었습니다.', 'success');
        router.push('/asn');
      } catch (err) {
        showToast(getErrorMessage(err, '입고 예정 등록에 실패했습니다.'), 'error');
      } finally {
        setSubmitting(false);
      }
    },
    [
      toBranchId,
      toWarehouseId,
      fromBranchId,
      fromWarehouseId,
      expectedDate,
      lines,
      router,
      showToast,
    ],
  );

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <Link href="/asn" className="text-sm text-slate-500 hover:underline">
          ← 목록
        </Link>
      </div>
      <h1 className="text-xl font-semibold text-slate-800">입고 예정 등록</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-medium text-slate-700">도착지</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-slate-500">도착 지사 *</label>
              <select
                value={toBranchId}
                onChange={(e) => {
                  setToBranchId(e.target.value);
                  setToWarehouseId('');
                }}
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">선택</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500">도착 창고 *</label>
              <select
                value={toWarehouseId}
                onChange={(e) => setToWarehouseId(e.target.value)}
                required
                disabled={!toBranchId}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="">선택</option>
                {toWarehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-medium text-slate-700">출발지 (선택)</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-slate-500">출발 지사</label>
              <select
                value={fromBranchId}
                onChange={(e) => {
                  setFromBranchId(e.target.value);
                  setFromWarehouseId('');
                }}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">선택 안 함</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500">출발 창고</label>
              <select
                value={fromWarehouseId}
                onChange={(e) => setFromWarehouseId(e.target.value)}
                disabled={!fromBranchId}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="">선택 안 함</option>
                {fromWarehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <label className="block text-xs text-slate-500">예정 입고일 *</label>
          <input
            type="date"
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
            required
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-700">품목 라인</h2>
            <button
              type="button"
              onClick={addLine}
              className="text-xs text-slate-600 hover:underline"
            >
              + 라인 추가
            </button>
          </div>
          <div className="space-y-2">
            {lines.map((line, idx) => (
              <div
                key={idx}
                className="flex flex-wrap items-end gap-2 rounded border border-slate-100 bg-slate-50 p-2"
              >
                <div className="min-w-[120px] flex-1">
                  <select
                    value={line.itemId}
                    onChange={(e) => updateLine(idx, 'itemId', e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  >
                    <option value="">품목 선택</option>
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.itemCode} - {i.itemName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-20">
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={line.quantity || ''}
                    onChange={(e) =>
                      updateLine(idx, 'quantity', parseFloat(e.target.value) || 0)
                    }
                    placeholder="수량"
                    className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                </div>
                <div className="w-32">
                  <input
                    type="date"
                    value={line.expiryDate || ''}
                    onChange={(e) => updateLine(idx, 'expiryDate', e.target.value)}
                    placeholder="유통기한"
                    className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeLine(idx)}
                  className="text-xs text-red-600 hover:underline"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {submitting ? '등록 중...' : '등록'}
          </button>
          <Link
            href="/asn"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            취소
          </Link>
        </div>
      </form>
    </div>
  );
}
