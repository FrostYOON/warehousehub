'use client';

import { useAuthSession } from '@/features/auth';
import { buildDashboardMenus, DashboardShell } from '@/features/dashboard';
import { useStocksPage } from '@/features/stocks/hooks/use-stocks-page';
import { ActionButton } from '@/shared/ui/common';

export default function StocksPage() {
  const { me, loggingOut, signOut } = useAuthSession();
  const {
    rows,
    loading,
    storageType,
    itemCode,
    setStorageType,
    setItemCode,
    loadStocks,
    resetFiltersAndReload,
  } = useStocksPage();

  return (
    <DashboardShell
      userName={me?.name ?? '사용자'}
      companyName={me?.companyName ?? '회사'}
      onLogout={signOut}
      loggingOut={loggingOut}
      menus={buildDashboardMenus(me?.role)}
    >
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">재고 조회</h2>
        <p className="mt-2 text-sm text-slate-600">
          창고 타입/품목코드로 필터링해 현재고, 예약수량, 가용수량을 확인합니다.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[200px_1fr_auto_auto]">
          <select
            value={storageType}
            onChange={(e) => setStorageType(e.target.value as '' | 'DRY' | 'COOL' | 'FRZ')}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          >
            <option value="">전체 창고</option>
            <option value="DRY">DRY</option>
            <option value="COOL">COOL</option>
            <option value="FRZ">FRZ</option>
          </select>
          <input
            value={itemCode}
            onChange={(e) => setItemCode(e.target.value)}
            placeholder="품목코드 (예: A001)"
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
          <ActionButton
            onClick={() => void loadStocks()}
            disabled={loading}
            className="h-10 rounded-lg border border-slate-300 px-4 text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? '조회 중...' : '조회'}
          </ActionButton>
          <ActionButton
            onClick={() => {
              void resetFiltersAndReload();
            }}
            disabled={loading}
            className="h-10 rounded-lg border border-slate-300 px-4 text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            초기화
          </ActionButton>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="px-2 py-2">창고</th>
                <th className="px-2 py-2">품목코드</th>
                <th className="px-2 py-2">품목명</th>
                <th className="px-2 py-2">유통기한</th>
                <th className="px-2 py-2">현재고</th>
                <th className="px-2 py-2">예약</th>
                <th className="px-2 py-2">가용</th>
                <th className="px-2 py-2">수정시각</th>
              </tr>
            </thead>
            <tbody>
              {!loading &&
                rows.map((row) => {
                  const available = row.onHand - row.reserved;
                  return (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-2 py-2">
                        {row.warehouse.type} ({row.warehouse.name})
                      </td>
                      <td className="px-2 py-2">{row.lot.item.itemCode}</td>
                      <td className="px-2 py-2">{row.lot.item.itemName}</td>
                      <td className="px-2 py-2">
                        {row.lot.expiryDate
                          ? new Date(row.lot.expiryDate).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="px-2 py-2">{row.onHand}</td>
                      <td className="px-2 py-2">{row.reserved}</td>
                      <td className="px-2 py-2">{available}</td>
                      <td className="px-2 py-2">
                        {new Date(row.updatedAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {!loading && rows.length === 0 && (
            <p className="mt-3 text-sm text-slate-600">조건에 맞는 재고가 없습니다.</p>
          )}
          {loading && (
            <p className="mt-3 text-sm text-slate-600">재고를 불러오는 중...</p>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
