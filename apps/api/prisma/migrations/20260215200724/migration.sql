-- CreateEnum
CREATE TYPE "OutboundStatus" AS ENUM ('DRAFT', 'PICKING', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OutboundLineStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- DropIndex
DROP INDEX "InventoryTx_companyId_createdAt_idx";

-- DropIndex
DROP INDEX "InventoryTx_companyId_type_idx";

-- DropIndex
DROP INDEX "InventoryTxLine_lotId_idx";

-- DropIndex
DROP INDEX "InventoryTxLine_warehouseId_idx";

-- DropIndex
DROP INDEX "Item_companyId_idx";

-- DropIndex
DROP INDEX "Item_itemCode_idx";

-- DropIndex
DROP INDEX "Lot_companyId_expiryDate_idx";

-- DropIndex
DROP INDEX "Lot_companyId_itemId_idx";

-- DropIndex
DROP INDEX "Stock_companyId_lotId_idx";

-- DropIndex
DROP INDEX "Stock_companyId_warehouseId_idx";

-- DropIndex
DROP INDEX "User_companyId_idx";

-- DropIndex
DROP INDEX "User_role_idx";

-- DropIndex
DROP INDEX "Warehouse_companyId_idx";

-- CreateTable
CREATE TABLE "OutboundOrder" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "plannedDate" TIMESTAMP(3) NOT NULL,
    "title" TEXT,
    "status" "OutboundStatus" NOT NULL DEFAULT 'DRAFT',
    "createdByUserId" TEXT,
    "confirmedByUserId" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "OutboundOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "requestedQty" INTEGER NOT NULL,
    "pickedQty" INTEGER NOT NULL DEFAULT 0,
    "shippedQty" INTEGER NOT NULL DEFAULT 0,
    "status" "OutboundLineStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboundLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickAllocation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "outboundLineId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "isReleased" BOOLEAN NOT NULL DEFAULT false,
    "releasedAt" TIMESTAMP(3),
    "isCommitted" BOOLEAN NOT NULL DEFAULT false,
    "committedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PickAllocation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OutboundOrder" ADD CONSTRAINT "OutboundOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundOrder" ADD CONSTRAINT "OutboundOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundOrder" ADD CONSTRAINT "OutboundOrder_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundOrder" ADD CONSTRAINT "OutboundOrder_confirmedByUserId_fkey" FOREIGN KEY ("confirmedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundOrder" ADD CONSTRAINT "OutboundOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundLine" ADD CONSTRAINT "OutboundLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "OutboundOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundLine" ADD CONSTRAINT "OutboundLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickAllocation" ADD CONSTRAINT "PickAllocation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickAllocation" ADD CONSTRAINT "PickAllocation_outboundLineId_fkey" FOREIGN KEY ("outboundLineId") REFERENCES "OutboundLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickAllocation" ADD CONSTRAINT "PickAllocation_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickAllocation" ADD CONSTRAINT "PickAllocation_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
