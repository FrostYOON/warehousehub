export type Customer = {
  id: string;
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
  customerName: string;
  customerAddress: string;
  postalCode?: string;
  city?: string;
  state?: string;
  country?: string;
};

export type UpdateCustomerPayload = Partial<CreateCustomerPayload>;
