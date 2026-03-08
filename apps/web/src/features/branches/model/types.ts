export type Branch = {
  id: string;
  companyId: string;
  name: string;
  code: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { warehouses: number };
};

export type BranchDetail = Branch & {
  warehouses: Array<{
    id: string;
    type: string;
    name: string;
    region: string;
    createdAt: string;
  }>;
};

export type CreateBranchPayload = {
  name: string;
  code?: string;
};
