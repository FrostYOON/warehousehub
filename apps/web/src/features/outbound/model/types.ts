export type OutboundStatus =
  | 'DRAFT'
  | 'PICKING'
  | 'PICKED'
  | 'READY_TO_SHIP'
  | 'SHIPPING'
  | 'DELIVERED'
  | 'CANCELLED';

export type OutboundLineStatus =
  | 'ACTIVE'
  | 'CANCELLED'
  | 'SHORT_SHIPPED'
  | 'DELIVERED';

export type OutboundLine = {
  id: string;
  itemId: string;
  item?: {
    id: string;
    itemCode: string;
    itemName: string;
  };
  requestedQty: number;
  pickedQty: number;
  shippedQty: number;
  deliveredQty: number;
  status: OutboundLineStatus;
};

export type OutboundOrder = {
  id: string;
  orderNo?: number;
  customerId: string;
  plannedDate: string;
  memo: string | null;
  status: OutboundStatus;
  createdAt: string;
  customer: {
    id: string;
    name?: string;
    customerName?: string;
    code?: string;
    customerAddress?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    lat?: number | string | null;
    lng?: number | string | null;
  };
  lines: OutboundLine[];
};
