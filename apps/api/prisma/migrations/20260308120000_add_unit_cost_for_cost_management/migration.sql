-- AlterTable: Item.unitCost
ALTER TABLE "Item" ADD COLUMN "unitCost" DECIMAL(18,4);

-- AlterTable: InboundUploadRow.unitCost
ALTER TABLE "InboundUploadRow" ADD COLUMN "unitCost" DECIMAL(18,4);

-- AlterTable: InventoryTxLine.unitCost
ALTER TABLE "InventoryTxLine" ADD COLUMN "unitCost" DECIMAL(18,4);
