export type AsnStatus = 'PENDING' | 'SHIPPED' | 'RECEIVED' | 'CANCELLED';

export type AsnLine = {
  id: string;
  itemId: string;
  quantity: number;
  expiryDate: string | null;
  item: { id: string; itemCode: string; itemName: string };
};

export type Asn = {
  id: string;
  companyId: string;
  fromBranchId: string | null;
  fromBranch: { id: string; name: string; code: string | null } | null;
  fromWarehouseId: string | null;
  fromWarehouse: { id: string; name: string; type: string } | null;
  toBranchId: string;
  toBranch: { id: string; name: string; code: string | null };
  toWarehouseId: string;
  toWarehouse: { id: string; name: string; type: string };
  expectedDate: string;
  status: AsnStatus;
  createdByUserId: string | null;
  createdByUser: { id: string; name: string } | null;
  receivedAt: string | null;
  lines: AsnLine[];
  createdAt: string;
  updatedAt: string;
};

export type CreateAsnPayload = {
  fromBranchId?: string;
  fromWarehouseId?: string;
  toBranchId: string;
  toWarehouseId: string;
  expectedDate: string;
  lines: Array<{
    itemId: string;
    quantity: number;
    expiryDate?: string;
  }>;
};
