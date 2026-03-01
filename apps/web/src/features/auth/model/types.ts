export type LoginRequest = {
  companyName: string;
  email: string;
  password: string;
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
  role: string;
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
