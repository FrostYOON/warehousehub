'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthSession } from '@/features/auth';
import { canAccessInbound } from '@/features/auth/model/role-policy';
import { buildDashboardMenus, DashboardShell } from '@/features/dashboard';
import { useInboundPage } from '@/features/inbound/hooks/use-inbound-page';
import { formatDecimalForDisplay } from '@/shared/utils/format-decimal';
import { ActionButton, SortableHeader, StatusBadge } from '@/shared/ui/common';

export default function InboundPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { me, loggingOut, signOut } = useAuthSession();
  const canAccess = canAccessInbound(me?.role);
  const {
    filteredUploads,
    selectedUpload,
    loadingList,
    loadingDetail,
    uploading,
    confirming,
    cancelling,
    selectedInvalidCount,
    statusFilter,
    keyword,
    listPage,
    listPageSize,
    listTotal,
    listTotalPages,
    detailRowPage,
    detailRowPageSize,
    setStatusFilter,
    setKeyword,
    setListPage,
    setListPageSize,
    sortKey,
    sortDir,
    toggleInboundSort,
    setDetailRowPage,
    setDetailRowPageSize,
    loadUploadDetail,
    uploadFile,
    confirmSelectedUpload,
    cancelSelectedUpload,
  } = useInboundPage();

  const confirmDisabledReason = !selectedUpload
    ? '상세를 선택해주세요.'
    : selectedUpload.status !== 'UPLOADED'
      ? 'UPLOADED 상태에서만 확정할 수 있습니다.'
      : selectedInvalidCount > 0
        ? '오류 행이 있으면 확정할 수 없습니다.'
        : undefined;

  const cancelDisabledReason = !selectedUpload
    ? '상세를 선택해주세요.'
    : selectedUpload.status !== 'UPLOADED'
      ? 'UPLOADED 상태에서만 취소할 수 있습니다.'
      : undefined;

  useEffect(() => {
    if (me && !canAccess) {
      router.replace('/');
    }
  }, [canAccess, me, router]);

  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'UPLOADED' || status === 'CONFIRMED' || status === 'CANCELLED') {
      setStatusFilter(status);
    }
    const key = searchParams.get('keyword');
    if (key) {
      setKeyword(key);
    }
  }, [searchParams, setKeyword, setStatusFilter]);

  return (
    <DashboardShell
      userName={me?.name ?? '사용자'}
      companyName={me?.companyName ?? '회사'}
      onLogout={signOut}
      loggingOut={loggingOut}
      menus={buildDashboardMenus(me?.role)}
    >
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">입고 업로드</h2>
        <p className="mt-2 text-sm text-slate-600">
          엑셀 파일을 업로드한 뒤 검증 결과를 확인하고 입고 확정을 진행합니다.
        </p>
        <div className="mt-4 space-y-2">
          <input
            type="file"
            accept=".xlsx,.xls"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void uploadFile(file);
                e.currentTarget.value = '';
              }
            }}
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-3 file:py-2 file:text-sm file:hover:bg-slate-50"
          />
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{uploading ? '업로드 중...' : '지원 형식: .xlsx, .xls'}</span>
            <span className="hidden sm:inline">/</span>
            <span>ExpiryDate가 없으면 `-`, 빈값, `N/A` 입력 가능</span>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-800">최근 업로드</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr]">
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as '' | 'UPLOADED' | 'CONFIRMED' | 'CANCELLED',
              )
            }
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          >
            <option value="">전체 상태</option>
            <option value="UPLOADED">UPLOADED</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="파일명 또는 업로드 ID 검색"
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <span>
            총 {listTotal}건 / {listPage} / {listTotalPages} 페이지
          </span>
          <div className="flex items-center gap-2">
            <span>페이지당</span>
            <select
              value={listPageSize}
              onChange={(e) => {
                setListPageSize(Number(e.target.value));
                setListPage(1);
              }}
              className="h-8 rounded border border-slate-300 px-2 text-xs"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
        {loadingList ? (
          <p className="mt-3 text-sm text-slate-600">목록을 불러오는 중...</p>
        ) : filteredUploads.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">업로드 이력이 없습니다.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <SortableHeader
                    label="파일명"
                    sortKey="fileName"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={(k) => toggleInboundSort(k as typeof sortKey)}
                    className="px-2 py-2"
                  />
                  <SortableHeader
                    label="상태"
                    sortKey="status"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={(k) => toggleInboundSort(k as typeof sortKey)}
                    className="px-2 py-2"
                  />
                  <SortableHeader
                    label="행 수"
                    sortKey="rowCount"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={(k) => toggleInboundSort(k as typeof sortKey)}
                    className="px-2 py-2"
                  />
                  <SortableHeader
                    label="오류"
                    sortKey="invalidCount"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={(k) => toggleInboundSort(k as typeof sortKey)}
                    className="px-2 py-2"
                  />
                  <SortableHeader
                    label="업로드 시각"
                    sortKey="createdAt"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={(k) => toggleInboundSort(k as typeof sortKey)}
                    className="px-2 py-2"
                  />
                  <th className="px-2 py-2">상세</th>
                </tr>
              </thead>
              <tbody>
                {filteredUploads.map((upload) => (
                  <tr key={upload.id} className="border-t border-slate-100">
                    <td className="px-2 py-2">{upload.fileName}</td>
                    <td className="px-2 py-2">
                      <StatusBadge status={upload.status} />
                    </td>
                    <td className="px-2 py-2">{upload.rowCount}</td>
                    <td className="px-2 py-2">{upload.invalidCount}</td>
                    <td className="px-2 py-2">
                      {new Date(upload.createdAt).toLocaleString()}
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDetailRowPage(1);
                          void loadUploadDetail(upload.id, { rowPage: 1 });
                        }}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                      >
                        보기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loadingList && listTotalPages > 1 ? (
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setListPage((prev) => Math.max(1, prev - 1))}
              disabled={listPage <= 1}
              className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-50"
            >
              이전
            </button>
            <span className="text-xs text-slate-600">
              {listPage} / {listTotalPages}
            </span>
            <button
              type="button"
              onClick={() => setListPage((prev) => Math.min(listTotalPages, prev + 1))}
              disabled={listPage >= listTotalPages}
              className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-50"
            >
              다음
            </button>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-800">업로드 상세</h3>
            {selectedUpload && (
              <p className="text-xs text-slate-500">
                상태: <StatusBadge status={selectedUpload.status} /> / 오류:{' '}
                {selectedInvalidCount}건
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ActionButton
              onClick={() => void confirmSelectedUpload()}
              disabled={
                confirming ||
                cancelling ||
                !selectedUpload ||
                selectedUpload.status !== 'UPLOADED' ||
                selectedInvalidCount > 0
              }
              disabledReason={confirmDisabledReason}
            >
              {confirming ? '확정 중...' : '입고 확정'}
            </ActionButton>
            <ActionButton
              onClick={() => void cancelSelectedUpload()}
              disabled={
                cancelling ||
                confirming ||
                !selectedUpload ||
                selectedUpload.status !== 'UPLOADED'
              }
              disabledReason={cancelDisabledReason}
            >
              {cancelling ? '취소 중...' : '입고 취소'}
            </ActionButton>
          </div>
        </div>

        {loadingDetail ? (
          <p className="mt-3 text-sm text-slate-600">상세를 불러오는 중...</p>
        ) : !selectedUpload ? (
          <p className="mt-3 text-sm text-slate-600">
            최근 업로드에서 상세 보기를 눌러주세요.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="px-2 py-2">ItemCode</th>
                  <th className="px-2 py-2">ItemName</th>
                  <th className="px-2 py-2">StorageType</th>
                  <th className="px-2 py-2">Quantity</th>
                  <th className="px-2 py-2">ExpiryDate</th>
                  <th className="px-2 py-2">유효성</th>
                  <th className="px-2 py-2">메시지</th>
                </tr>
              </thead>
              <tbody>
                {selectedUpload.rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`border-t border-slate-100 ${!row.isValid ? 'bg-red-50/60' : ''}`}
                  >
                    <td className="px-2 py-2">{row.itemCode}</td>
                    <td className="px-2 py-2">{row.itemName}</td>
                    <td className="px-2 py-2">{row.storageType}</td>
                    <td className="px-2 py-2">{formatDecimalForDisplay(row.quantity)}</td>
                    <td className="px-2 py-2">
                      {row.expiryDate
                        ? new Date(row.expiryDate).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-2 py-2">
                      {row.isValid ? (
                        <StatusBadge status="VALID" />
                      ) : (
                        <StatusBadge status="INVALID" />
                      )}
                    </td>
                    <td className="px-2 py-2 text-xs text-slate-600">
                      {row.errorMessage ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {selectedUpload.rowTotalPages > 1 ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span>페이지당</span>
                  <select
                    value={detailRowPageSize}
                    onChange={(e) => {
                      const nextSize = Number(e.target.value);
                      setDetailRowPageSize(nextSize);
                      setDetailRowPage(1);
                      void loadUploadDetail(selectedUpload.id, {
                        rowPage: 1,
                        rowPageSize: nextSize,
                      });
                    }}
                    className="h-8 rounded border border-slate-300 px-2 text-xs"
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(1, detailRowPage - 1);
                      setDetailRowPage(next);
                      void loadUploadDetail(selectedUpload.id, { rowPage: next });
                    }}
                    disabled={detailRowPage <= 1}
                    className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-100 disabled:opacity-50"
                  >
                    이전
                  </button>
                  <span>
                    {detailRowPage} / {selectedUpload.rowTotalPages} (총 {selectedUpload.rowTotal}건)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.min(selectedUpload.rowTotalPages, detailRowPage + 1);
                      setDetailRowPage(next);
                      void loadUploadDetail(selectedUpload.id, { rowPage: next });
                    }}
                    disabled={detailRowPage >= selectedUpload.rowTotalPages}
                    className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-100 disabled:opacity-50"
                  >
                    다음
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
