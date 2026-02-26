export type LoginRequest = {
  companyName: string;
  email: string;
  password: string;
};

export type MeResponse = {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId: string;
  companyName: string | null;
};
