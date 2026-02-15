/*
  Warnings:

  - You are about to drop the `OutboundLine` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OutboundOrder` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PickAllocation` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "OutboundLine" DROP CONSTRAINT "OutboundLine_itemId_fkey";

-- DropForeignKey
ALTER TABLE "OutboundLine" DROP CONSTRAINT "OutboundLine_orderId_fkey";

-- DropForeignKey
ALTER TABLE "OutboundOrder" DROP CONSTRAINT "OutboundOrder_companyId_fkey";

-- DropForeignKey
ALTER TABLE "OutboundOrder" DROP CONSTRAINT "OutboundOrder_confirmedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "OutboundOrder" DROP CONSTRAINT "OutboundOrder_createdByUserId_fkey";

-- DropForeignKey
ALTER TABLE "OutboundOrder" DROP CONSTRAINT "OutboundOrder_customerId_fkey";

-- DropForeignKey
ALTER TABLE "OutboundOrder" DROP CONSTRAINT "OutboundOrder_userId_fkey";

-- DropForeignKey
ALTER TABLE "PickAllocation" DROP CONSTRAINT "PickAllocation_companyId_fkey";

-- DropForeignKey
ALTER TABLE "PickAllocation" DROP CONSTRAINT "PickAllocation_lotId_fkey";

-- DropForeignKey
ALTER TABLE "PickAllocation" DROP CONSTRAINT "PickAllocation_outboundLineId_fkey";

-- DropForeignKey
ALTER TABLE "PickAllocation" DROP CONSTRAINT "PickAllocation_warehouseId_fkey";

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "state" TEXT;

-- DropTable
DROP TABLE "OutboundLine";

-- DropTable
DROP TABLE "OutboundOrder";

-- DropTable
DROP TABLE "PickAllocation";

-- DropEnum
DROP TYPE "OutboundLineStatus";

-- DropEnum
DROP TYPE "OutboundStatus";

-- CreateIndex
CREATE INDEX "InventoryTx_companyId_type_idx" ON "InventoryTx"("companyId", "type");

-- CreateIndex
CREATE INDEX "InventoryTx_companyId_createdAt_idx" ON "InventoryTx"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryTxLine_warehouseId_idx" ON "InventoryTxLine"("warehouseId");

-- CreateIndex
CREATE INDEX "InventoryTxLine_lotId_idx" ON "InventoryTxLine"("lotId");

-- CreateIndex
CREATE INDEX "Item_companyId_idx" ON "Item"("companyId");

-- CreateIndex
CREATE INDEX "Item_itemCode_idx" ON "Item"("itemCode");

-- CreateIndex
CREATE INDEX "Lot_companyId_itemId_idx" ON "Lot"("companyId", "itemId");

-- CreateIndex
CREATE INDEX "Lot_companyId_expiryDate_idx" ON "Lot"("companyId", "expiryDate");

-- CreateIndex
CREATE INDEX "Stock_companyId_warehouseId_idx" ON "Stock"("companyId", "warehouseId");

-- CreateIndex
CREATE INDEX "Stock_companyId_lotId_idx" ON "Stock"("companyId", "lotId");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Warehouse_companyId_idx" ON "Warehouse"("companyId");
