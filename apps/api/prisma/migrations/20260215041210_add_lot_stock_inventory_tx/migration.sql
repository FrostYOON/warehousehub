-- CreateEnum
CREATE TYPE "InventoryTxType" AS ENUM ('INBOUND_CONFIRM', 'OUTBOUND_CONFIRM', 'PICK_RESERVE', 'PICK_RELEASE', 'ADJUSTMENT', 'RETURN_RESTOCK', 'RETURN_DISCARD');

-- CreateTable
CREATE TABLE "Lot" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stock" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "onHand" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTx" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "InventoryTxType" NOT NULL,
    "actorUserId" TEXT,
    "refType" TEXT,
    "refId" TEXT,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryTx_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTxLine" (
    "id" TEXT NOT NULL,
    "txId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "qtyDelta" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryTxLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lot_companyId_itemId_idx" ON "Lot"("companyId", "itemId");

-- CreateIndex
CREATE INDEX "Lot_companyId_expiryDate_idx" ON "Lot"("companyId", "expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "Lot_companyId_itemId_expiryDate_key" ON "Lot"("companyId", "itemId", "expiryDate");

-- CreateIndex
CREATE INDEX "Stock_companyId_warehouseId_idx" ON "Stock"("companyId", "warehouseId");

-- CreateIndex
CREATE INDEX "Stock_companyId_lotId_idx" ON "Stock"("companyId", "lotId");

-- CreateIndex
CREATE UNIQUE INDEX "Stock_companyId_warehouseId_lotId_key" ON "Stock"("companyId", "warehouseId", "lotId");

-- CreateIndex
CREATE INDEX "InventoryTx_companyId_type_idx" ON "InventoryTx"("companyId", "type");

-- CreateIndex
CREATE INDEX "InventoryTx_companyId_createdAt_idx" ON "InventoryTx"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryTxLine_warehouseId_idx" ON "InventoryTxLine"("warehouseId");

-- CreateIndex
CREATE INDEX "InventoryTxLine_lotId_idx" ON "InventoryTxLine"("lotId");

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTx" ADD CONSTRAINT "InventoryTx_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTx" ADD CONSTRAINT "InventoryTx_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTxLine" ADD CONSTRAINT "InventoryTxLine_txId_fkey" FOREIGN KEY ("txId") REFERENCES "InventoryTx"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTxLine" ADD CONSTRAINT "InventoryTxLine_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTxLine" ADD CONSTRAINT "InventoryTxLine_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
