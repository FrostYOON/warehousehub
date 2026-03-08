'use client';

import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import {
  getCompanyBranding,
  updateCompanyBranding,
  type UpdateCompanyBrandingPayload,
} from '@/features/companies/api/companies.api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useToast } from '@/shared/ui/toast/toast-provider';
import { getErrorMessage } from '@/shared/utils/get-error-message';

export default function CompanySettingsPage() {
  const { me, refreshMe } = useAuthSession();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [logoUrl, setLogoUrl] = useState('');
  const [brandPrimaryColor, setBrandPrimaryColor] = useState('');
  const [initialized, setInitialized] = useState(false);

  const { data: company, isLoading } = useQuery({
    queryKey: ['companies', 'me'],
    queryFn: getCompanyBranding,
    enabled: me?.role === 'ADMIN',
  });

  useEffect(() => {
    if (company && !initialized) {
      setLogoUrl(company.logoUrl ?? '');
      setBrandPrimaryColor(company.brandPrimaryColor ?? '');
      setInitialized(true);
    }
  }, [company, initialized]);

  const mutation = useMutation({
    mutationFn: (payload: UpdateCompanyBrandingPayload) =>
      updateCompanyBranding(payload),
    onSuccess: async (data) => {
      queryClient.setQueryData(['companies', 'me'], data);
      await refreshMe();
      showToast('회사 설정이 저장되었습니다.', 'success');
    },
    onError: (err) => {
      showToast(getErrorMessage(err, '저장에 실패했습니다.'), 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      logoUrl: logoUrl.trim() || null,
      brandPrimaryColor: brandPrimaryColor.trim() || null,
    });
  };

  if (me?.role !== 'ADMIN') {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-800">
        <p className="font-medium">관리자(ADMIN)만 회사 설정을 변경할 수 있습니다.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900">회사 설정</h1>
      <p className="mt-1 text-sm text-slate-600">
        멀티테넌시 브랜딩: 로고와 브랜드 색상을 설정합니다.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div>
          <label
            htmlFor="company-logo-url"
            className="block text-sm font-medium text-slate-700"
          >
            로고 URL
          </label>
          <input
            id="company-logo-url"
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
          <p className="mt-1 text-xs text-slate-500">
            헤더에 표시될 로고 이미지 URL. 비우면 기본 텍스트가 표시됩니다.
          </p>
        </div>

        <div>
          <label
            htmlFor="company-brand-color"
            className="block text-sm font-medium text-slate-700"
          >
            브랜드 주 색상
          </label>
          <div className="mt-1 flex items-center gap-3">
            <input
              id="company-brand-color"
              type="text"
              value={brandPrimaryColor}
              onChange={(e) => setBrandPrimaryColor(e.target.value)}
              placeholder="#2563eb"
              className="block flex-1 rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
            {brandPrimaryColor && (
              <div
                className="h-10 w-10 shrink-0 rounded-lg border border-slate-300"
                style={{ backgroundColor: brandPrimaryColor }}
                aria-hidden
              />
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            사이드바·헤더 등에 사용될 CSS 색상 (예: #2563eb)
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-lg border border-slate-300 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            {mutation.isPending ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  );
}
