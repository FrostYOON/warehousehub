export type Customer = {
  id: string;
  customerCode: string | null;
  customerName: string;
  customerAddress: string;
  postalCode: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateCustomerPayload = {
  customerCode?: string;
  customerName: string;
  customerAddress: string;
  postalCode?: string;
  city?: string;
  state?: string;
  country?: string;
};

export type UpdateCustomerPayload = Partial<CreateCustomerPayload>;
