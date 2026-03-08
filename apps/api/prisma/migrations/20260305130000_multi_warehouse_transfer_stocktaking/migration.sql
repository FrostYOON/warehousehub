-- 1. Warehouse: region 추가 및 unique 제약 변경
-- 기존 데이터 호환: region='default'
ALTER TABLE "Warehouse" ADD COLUMN IF NOT EXISTS "region" TEXT NOT NULL DEFAULT 'default';

-- 기존 unique 제약 제거
ALTER TABLE "Warehouse" DROP CONSTRAINT IF EXISTS "Warehouse_companyId_type_key";

-- 새 복합 unique 제약 추가
CREATE UNIQUE INDEX IF NOT EXISTS "Warehouse_companyId_type_region_key" ON "Warehouse"("companyId", "type", "region");

-- 2. InventoryTxType에 TRANSFER 추가
ALTER TYPE "InventoryTxType" ADD VALUE IF NOT EXISTS 'TRANSFER';

-- 3. TransferStatus enum 생성
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- 4. StocktakingStatus enum 생성
CREATE TYPE "StocktakingStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'CONFIRMED', 'CANCELLED');

-- 5. Transfer 테이블 생성
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "fromWarehouseId" TEXT NOT NULL,
    "toWarehouseId" TEXT NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "memo" TEXT,
    "requestedByUserId" TEXT,
    "confirmedByUserId" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Transfer_companyId_idx" ON "Transfer"("companyId");
CREATE INDEX "Transfer_companyId_status_idx" ON "Transfer"("companyId", "status");
CREATE INDEX "Transfer_fromWarehouseId_idx" ON "Transfer"("fromWarehouseId");
CREATE INDEX "Transfer_toWarehouseId_idx" ON "Transfer"("toWarehouseId");

ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6. TransferLine 테이블 생성
CREATE TABLE "TransferLine" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "qty" DECIMAL(18,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransferLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TransferLine_transferId_idx" ON "TransferLine"("transferId");
CREATE INDEX "TransferLine_lotId_idx" ON "TransferLine"("lotId");

ALTER TABLE "TransferLine" ADD CONSTRAINT "TransferLine_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransferLine" ADD CONSTRAINT "TransferLine_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 7. Stocktaking 테이블 생성
CREATE TABLE "Stocktaking" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "status" "StocktakingStatus" NOT NULL DEFAULT 'DRAFT',
    "memo" TEXT,
    "createdByUserId" TEXT,
    "confirmedByUserId" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stocktaking_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Stocktaking_companyId_idx" ON "Stocktaking"("companyId");
CREATE INDEX "Stocktaking_companyId_status_idx" ON "Stocktaking"("companyId", "status");
CREATE INDEX "Stocktaking_warehouseId_idx" ON "Stocktaking"("warehouseId");

ALTER TABLE "Stocktaking" ADD CONSTRAINT "Stocktaking_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Stocktaking" ADD CONSTRAINT "Stocktaking_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 8. StocktakingLine 테이블 생성
CREATE TABLE "StocktakingLine" (
    "id" TEXT NOT NULL,
    "stocktakingId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "systemQty" DECIMAL(18,3) NOT NULL,
    "actualQty" DECIMAL(18,3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StocktakingLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StocktakingLine_stocktakingId_lotId_key" ON "StocktakingLine"("stocktakingId", "lotId");
CREATE INDEX "StocktakingLine_stocktakingId_idx" ON "StocktakingLine"("stocktakingId");
CREATE INDEX "StocktakingLine_lotId_idx" ON "StocktakingLine"("lotId");

ALTER TABLE "StocktakingLine" ADD CONSTRAINT "StocktakingLine_stocktakingId_fkey" FOREIGN KEY ("stocktakingId") REFERENCES "Stocktaking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StocktakingLine" ADD CONSTRAINT "StocktakingLine_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
