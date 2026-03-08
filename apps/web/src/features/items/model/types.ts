export type Item = {
  id: string;
  companyId: string;
  itemCode: string;
  itemName: string;
  unitCost?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateItemPayload = {
  itemCode: string;
  itemName: string;
  unitCost?: number;
};

export type UpdateItemPayload = {
  itemCode?: string;
  itemName?: string;
  unitCost?: number;
};
