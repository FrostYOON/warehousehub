export type StorageType = 'DRY' | 'COOL' | 'FRZ';

export type StockRow = {
  id: string;
  onHand: number;
  reserved: number;
  updatedAt: string;
  warehouse: {
    id: string;
    type: StorageType;
    name: string;
  };
  lot: {
    id: string;
    expiryDate: string | null;
    item: {
      id: string;
      itemCode: string;
      itemName: string;
    };
  };
};

export type ExpirySoonDays = 7 | 14 | 30 | 60 | 90;

export type StocksQuery = {
  storageType?: StorageType;
  warehouseId?: string;
  itemCode?: string;
  expirySoon?: ExpirySoonDays;
  page?: number;
  pageSize?: number;
};

export type StocksListResponse = {
  items: StockRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ItemAnalyticsRange = 'WEEK' | 'QUARTER' | 'HALF' | 'YEAR';

export type StockItemOption = {
  id: string;
  itemCode: string;
  itemName: string;
};

export type StockItemTrendBucket = {
  label: string;
  outboundQty: number;
  returnQty: number;
  returnRate: number;
};

export type StockItemTrend = {
  item: StockItemOption | null;
  range: ItemAnalyticsRange;
  buckets: StockItemTrendBucket[];
  totals: {
    outboundQty: number;
    returnQty: number;
    returnRate: number;
  };
  asOf: string;
};
