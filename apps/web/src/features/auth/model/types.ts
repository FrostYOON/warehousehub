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

/** Admin(신규 회사 최초 관리자) 회원가입 - POST /auth/register */
export type RegisterRequest = {
  companyName: string;
  name: string;
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
  role: UserRole;
  companyId: string;
  companyName: string | null;
  /** 담당 지사 ID 배열. null = 전체 지사 접근 */
  branchIds?: string[] | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
  profileImageUrl?: string | null;
};

export type UpdateProfilePayload = {
  name: string;
  dateOfBirth?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
  profileImageUrl?: string | null;
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

export type CompanyUserBranch = {
  id: string;
  name: string;
  code: string | null;
};

export type CompanyUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: string | null;
  departmentCode?: string | null;
  supervisorId?: string | null;
  supervisor?: { id: string; name: string; email: string } | null;
  branchIds?: string[];
  branches?: CompanyUserBranch[];
  createdAt: string;
  updatedAt: string;
};

export type UserAuditLogItem = {
  id: string;
  userId: string;
  actorUserId: string;
  action: string;
  beforeValue: string | null;
  afterValue: string | null;
  createdAt: string;
  actorUser: {
    id: string;
    name: string;
    email: string;
  };
};

export type UserAuditLogsResponse = {
  items: UserAuditLogItem[];
};
