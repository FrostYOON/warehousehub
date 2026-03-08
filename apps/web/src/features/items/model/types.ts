export type Item = {
  id: string;
  companyId: string;
  itemCode: string;
  itemName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateItemPayload = {
  itemCode: string;
  itemName: string;
};

export type UpdateItemPayload = {
  itemCode?: string;
  itemName?: string;
};
