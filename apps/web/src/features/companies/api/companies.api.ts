import { httpClient } from '@/shared/api/http-client';

export type CompanyBranding = {
  id: string;
  name: string;
  logoUrl: string | null;
  brandPrimaryColor: string | null;
};

export async function getCompanyBranding(): Promise<CompanyBranding> {
  const res = await httpClient.get<CompanyBranding>('/companies/me');
  return res.data;
}

export type UpdateCompanyBrandingPayload = {
  logoUrl?: string | null;
  brandPrimaryColor?: string | null;
};

export async function updateCompanyBranding(
  payload: UpdateCompanyBrandingPayload,
): Promise<CompanyBranding> {
  const res = await httpClient.patch<CompanyBranding>('/companies/me', payload);
  return res.data;
}
