'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  cancelInboundUpload,
  confirmInboundUpload,
  createInboundUpload,
  getInboundUploadDetail,
  getInboundUploads,
} from '@/features/inbound/api/inbound.api';
import type { InboundUploadDetail, InboundUploadSummary } from '@/features/inbound/model/types';
import { useToast } from '@/shared/ui/toast/toast-provider';

function errorMessageFromUnknown(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as { message?: string | string[] };
    if (Array.isArray(payload?.message)) return payload.message[0] ?? '요청에 실패했습니다.';
    return payload?.message ?? '요청에 실패했습니다.';
  }
  return '요청에 실패했습니다.';
}

function normalizeQuantity(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === 'object') {
    const decimalLike = value as {
      toNumber?: () => number;
      toString?: () => string;
      s?: number;
      e?: number;
      d?: number[];
    };

    if (typeof decimalLike.toNumber === 'function') {
      const n = decimalLike.toNumber();
      if (Number.isFinite(n)) return n;
    }

    if (typeof decimalLike.toString === 'function') {
      const str = decimalLike.toString();
      if (str !== '[object Object]') {
        const n = Number(str);
        if (Number.isFinite(n)) return n;
      }
    }

    if (
      typeof decimalLike.s === 'number' &&
      typeof decimalLike.e === 'number' &&
      Array.isArray(decimalLike.d) &&
      decimalLike.d.length > 0
    ) {
      const digits = decimalLike.d
        .map((chunk, idx) => (idx === 0 ? String(chunk) : String(chunk).padStart(7, '0')))
        .join('');
      const pointPos = decimalLike.e + 1;
      let numericString = digits;
      if (pointPos < digits.length) {
        numericString = `${digits.slice(0, pointPos)}.${digits.slice(pointPos)}`;
      } else if (pointPos > digits.length) {
        numericString = `${digits}${'0'.repeat(pointPos - digits.length)}`;
      }
      if (decimalLike.s < 0) numericString = `-${numericString}`;
      const n = Number(numericString);
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

export function useInboundPage() {
  const { showToast } = useToast();
  const [uploads, setUploads] = useState<InboundUploadSummary[]>([]);
  const [selectedUpload, setSelectedUpload] = useState<InboundUploadDetail | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'' | 'UPLOADED' | 'CONFIRMED' | 'CANCELLED'>('');
  const [keyword, setKeyword] = useState('');
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(20);
  const [sortKey, setSortKey] = useState<
    'fileName' | 'status' | 'rowCount' | 'invalidCount' | 'createdAt'
  >('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [listTotal, setListTotal] = useState(0);
  const [listTotalPages, setListTotalPages] = useState(1);
  const [detailRowPage, setDetailRowPage] = useState(1);
  const [detailRowPageSize, setDetailRowPageSize] = useState(50);

  const selectedInvalidCount = useMemo(
    () => selectedUpload?.rows.filter((row) => !row.isValid).length ?? 0,
    [selectedUpload],
  );

  const filteredUploads = useMemo(() => {
    const list = [...uploads];
    const factor = sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      switch (sortKey) {
        case 'fileName':
          return factor * (a.fileName?.localeCompare(b.fileName ?? '') ?? 0);
        case 'status':
          return factor * (a.status?.localeCompare(b.status ?? '') ?? 0);
        case 'rowCount':
          return factor * ((a.rowCount ?? 0) - (b.rowCount ?? 0));
        case 'invalidCount':
          return factor * ((a.invalidCount ?? 0) - (b.invalidCount ?? 0));
        case 'createdAt':
          return factor * (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        default:
          return 0;
      }
    });
    return list;
  }, [uploads, sortKey, sortDir]);

  function toggleInboundSort(key: typeof sortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir('desc');
  }

  const refreshUploads = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await getInboundUploads({
        status: statusFilter,
        keyword,
        page: listPage,
        pageSize: listPageSize,
      });
      setUploads(data.items);
      setListTotal(data.total);
      setListTotalPages(data.totalPages);
      setListPage(data.page);
      setListPageSize(data.pageSize);
    } catch (error) {
      showToast(errorMessageFromUnknown(error), 'error');
    } finally {
      setLoadingList(false);
    }
  }, [keyword, listPage, listPageSize, showToast, statusFilter]);

  const loadUploadDetail = useCallback(
    async (
      uploadId: string,
      options?: { rowPage?: number; rowPageSize?: number },
    ) => {
      setLoadingDetail(true);
      try {
        const detail = await getInboundUploadDetail(uploadId, {
          rowPage: options?.rowPage ?? detailRowPage,
          rowPageSize: options?.rowPageSize ?? detailRowPageSize,
        });
        setDetailRowPage(detail.rowPage);
        setDetailRowPageSize(detail.rowPageSize);
        setSelectedUpload({
          ...detail,
          rows: detail.rows.map((row) => ({
            ...row,
            quantity: normalizeQuantity(row.quantity),
          })),
        });
      } catch (error) {
        showToast(errorMessageFromUnknown(error), 'error');
      } finally {
        setLoadingDetail(false);
      }
    },
    [detailRowPage, detailRowPageSize, showToast],
  );

  useEffect(() => {
    void refreshUploads();
  }, [refreshUploads]);

  useEffect(() => {
    setListPage(1);
  }, [statusFilter, keyword, listPageSize]);

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const created = await createInboundUpload(file);
      await refreshUploads();
      await loadUploadDetail(created.id, { rowPage: 1 });
      if (created.invalidCount > 0) {
        showToast(
          `업로드 완료 (유효성 오류 ${created.invalidCount}건)`,
          'error',
        );
      } else {
        showToast('업로드가 완료되었습니다.', 'success');
      }
    } catch (error) {
      showToast(errorMessageFromUnknown(error), 'error');
    } finally {
      setUploading(false);
    }
  }

  async function confirmSelectedUpload() {
    if (!selectedUpload) return;
    setConfirming(true);
    try {
      await confirmInboundUpload(selectedUpload.id);
      await refreshUploads();
      await loadUploadDetail(selectedUpload.id, { rowPage: detailRowPage });
      showToast('입고 확정이 완료되었습니다.', 'success');
    } catch (error) {
      showToast(errorMessageFromUnknown(error), 'error');
    } finally {
      setConfirming(false);
    }
  }

  async function cancelSelectedUpload() {
    if (!selectedUpload) return;
    setCancelling(true);
    try {
      await cancelInboundUpload(selectedUpload.id);
      await refreshUploads();
      await loadUploadDetail(selectedUpload.id, { rowPage: detailRowPage });
      showToast('입고 업로드를 취소했습니다.', 'success');
    } catch (error) {
      showToast(errorMessageFromUnknown(error), 'error');
    } finally {
      setCancelling(false);
    }
  }

  return {
    uploads,
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
    refreshUploads,
    loadUploadDetail,
    uploadFile,
    confirmSelectedUpload,
    cancelSelectedUpload,
  };
}
