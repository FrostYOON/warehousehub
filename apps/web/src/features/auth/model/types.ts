export type UserRole = 'ADMIN' | 'WH_MANAGER' | 'DELIVERY' | 'ACCOUNTING' | 'SALES';

export type LoginRequest = {
  companyName: string;
  email: string;
  password: string;
};

export type SignupRequest = {
  companyName: string;
  email: string;
  name: string;
  password: string;
  role: Exclude<UserRole, 'ADMIN'>;
};

export type LoginCompany = {
  id: string;
  name: string;
};

export type LoginCompaniesResponse = {
  companies: LoginCompany[];
};

export type MeResponse = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string;
  companyName: string | null;
};

export type DeviceSession = {
  id: string;
  deviceId: string | null;
  deviceName: string | null;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
};

export type DeviceSessionsResponse = {
  maxActiveDevices: number;
  devices: DeviceSession[];
};

export type LogoutOthersResponse = {
  ok: boolean;
  revokedCount: number;
};

export type CompanyUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
