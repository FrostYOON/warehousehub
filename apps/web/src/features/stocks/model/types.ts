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

export type StocksQuery = {
  storageType?: StorageType;
  itemCode?: string;
};
