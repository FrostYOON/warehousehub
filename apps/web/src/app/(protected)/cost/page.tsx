'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthSession } from '@/features/auth';
import {
  getInboundCostHistory,
  getItemsCostSummary,
  type InboundCostHistoryItem,
  type ItemsCostSummaryItem,
} from '@/features/cost/api/cost.api';
import { useToast } from '@/shared/ui/toast/toast-provider';
import { formatDecimalForDisplay } from '@/shared/utils/format-decimal';

function canAccessCost(role?: string): boolean {
  return role === 'ADMIN' || role === 'WH_MANAGER' || role === 'ACCOUNTING';
}

export default function CostPage() {
  const router = useRouter();
  const { me } = useAuthSession();
  const { showToast } = useToast();
  const access = canAccessCost(me?.role);

  const [activeTab, setActiveTab] = useState<'inbound' | 'items'>('inbound');
  const [inboundLoading, setInboundLoading] = useState(true);
  const [inboundData, setInboundData] = useState<{
    items: InboundCostHistoryItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  } | null>(null);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsData, setItemsData] = useState<{
    items: ItemsCostSummaryItem[];
    total: number;
    page: number;
    totalPages: number;
  } | null>(null);
  const [itemsQuery, setItemsQuery] = useState('');
  const [itemsPage, setItemsPage] = useState(1);

  useEffect(() => {
    if (me && !access) {
      router.replace('/');
    }
  }, [access, me, router]);

  useEffect(() => {
    if (!access) return;
    let alive = true;
    setInboundLoading(true);
    getInboundCostHistory({ page: 1, pageSize: 20 })
      .then((data) => {
        if (alive) setInboundData(data);
      })
      .catch(() => {
        if (alive) showToast('입고 원가 이력을 불러오지 못했습니다.', 'error');
      })
      .finally(() => {
        if (alive) setInboundLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [access, showToast]);

  useEffect(() => {
    if (!access) return;
    let alive = true;
    setItemsLoading(true);
    getItemsCostSummary({ q: itemsQuery || undefined, page: itemsPage, pageSize: 50 })
      .then((data) => {
        if (alive)
          setItemsData({
            items: data.items,
            total: data.total,
            page: data.page,
            totalPages: data.totalPages,
          });
      })
      .catch(() => {
        if (alive) showToast('품목 원가 요약을 불러오지 못했습니다.', 'error');
      })
      .finally(() => {
        if (alive) setItemsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [access, itemsQuery, itemsPage, showToast]);

  if (!access) return null;

  return (
    <section className="page-section">
      <h2 className="page-title">비용/원가 관리</h2>
      <p className="page-description">
        품목 원가, 입고 시 기록된 원가 이력 및 품목별 원가 요약을 확인합니다.
      </p>

      <div className="mt-4 flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('inbound')}
          className={`border-b-2 px-3 py-2 text-sm font-medium transition ${
            activeTab === 'inbound'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          입고 원가 이력
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('items')}
          className={`border-b-2 px-3 py-2 text-sm font-medium transition ${
            activeTab === 'items'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          품목별 원가 요약
        </button>
      </div>

      {activeTab === 'inbound' && (
        <div className="mt-4">
          {inboundLoading ? (
            <p className="text-sm text-slate-600">로딩 중...</p>
          ) : inboundData && inboundData.items.length > 0 ? (
            <div className="space-y-3">
              <div className="table-wrapper">
                <table className="data-table min-w-[720px]">
                  <thead>
                    <tr>
                      <th>입고ID</th>
                      <th>일시</th>
                      <th>품목코드</th>
                      <th>품목명</th>
                      <th className="text-right">수량</th>
                      <th className="text-right">단가</th>
                      <th className="text-right">금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inboundData.items.flatMap((tx) =>
                      tx.lines.map((line) => (
                        <tr key={line.id}>
                          <td className="font-mono text-xs text-slate-500">
                            {tx.refId?.slice(0, 8) ?? '-'}
                          </td>
                          <td className="text-sm text-slate-600">
                            {new Date(tx.createdAt).toLocaleString('ko-KR')}
                          </td>
                          <td>{line.itemCode}</td>
                          <td>{line.itemName}</td>
                          <td className="text-right tabular-nums">
                            {formatDecimalForDisplay(line.qty)}
                          </td>
                          <td className="text-right tabular-nums">
                            {line.unitCost != null
                              ? Number(line.unitCost).toLocaleString()
                              : '-'}
                          </td>
                          <td className="text-right tabular-nums">
                            {line.totalCost != null
                              ? Number(line.totalCost).toLocaleString()
                              : '-'}
                          </td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500">
                총 {inboundData.total}건 (최근 20건 표시)
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              입고 원가 이력이 없습니다. 입고 시 UnitCost 컬럼을 포함하면 원가가
              기록됩니다.
            </p>
          )}
        </div>
      )}

      {activeTab === 'items' && (
        <div className="mt-4">
          <div className="mb-3 flex gap-2">
            <input
              type="search"
              placeholder="품목 검색"
              value={itemsQuery}
              onChange={(e) => {
                setItemsQuery(e.target.value);
                setItemsPage(1);
              }}
              className="form-input h-9 w-48"
            />
          </div>
          {itemsLoading ? (
            <p className="text-sm text-slate-600">로딩 중...</p>
          ) : itemsData && itemsData.items.length > 0 ? (
            <div className="space-y-3">
              <div className="table-wrapper">
                <table className="data-table min-w-[400px]">
                  <thead>
                    <tr>
                      <th>품목코드</th>
                      <th>품목명</th>
                      <th className="text-right">기본 원가</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsData.items.map((item) => (
                      <tr key={item.id}>
                        <td className="font-mono text-slate-600">
                          {item.itemCode}
                        </td>
                        <td>{item.itemName}</td>
                        <td className="text-right tabular-nums">
                          {item.unitCost != null
                            ? Number(item.unitCost).toLocaleString()
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500">
                총 {itemsData.total}건 · {itemsData.page} / {itemsData.totalPages}
                페이지
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              품목 원가 데이터가 없습니다. 품목 관리에서 기본 원가를 등록하세요.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
