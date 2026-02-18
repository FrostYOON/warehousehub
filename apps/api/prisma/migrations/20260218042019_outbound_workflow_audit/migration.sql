/*
  Warnings:

  - You are about to drop the column `confirmedAt` on the `OutboundOrder` table. All the data in the column will be lost.
  - You are about to drop the column `confirmedByUserId` on the `OutboundOrder` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `OutboundLine` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OutboundLineStatus" ADD VALUE 'SHORT_SHIPPED';
ALTER TYPE "OutboundLineStatus" ADD VALUE 'DELIVERED';

-- DropForeignKey
ALTER TABLE "OutboundOrder" DROP CONSTRAINT "OutboundOrder_confirmedByUserId_fkey";

-- DropIndex
DROP INDEX "PickAllocation_companyId_outboundLineId_idx";

-- AlterTable
ALTER TABLE "OutboundLine" ADD COLUMN     "deliveredQty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "OutboundOrder" DROP COLUMN "confirmedAt",
DROP COLUMN "confirmedByUserId",
ADD COLUMN     "pickedSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "pickedSubmittedByUserId" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "PickAllocation" ADD COLUMN     "manualReason" TEXT,
ADD COLUMN     "pickedAt" TIMESTAMP(3),
ADD COLUMN     "pickedByUserId" TEXT,
ADD COLUMN     "pickedQty" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "InventoryTx_companyId_type_idx" ON "InventoryTx"("companyId", "type");

-- CreateIndex
CREATE INDEX "InventoryTx_companyId_createdAt_idx" ON "InventoryTx"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryTxLine_txId_idx" ON "InventoryTxLine"("txId");

-- CreateIndex
CREATE INDEX "InventoryTxLine_warehouseId_idx" ON "InventoryTxLine"("warehouseId");

-- CreateIndex
CREATE INDEX "InventoryTxLine_lotId_idx" ON "InventoryTxLine"("lotId");

-- CreateIndex
CREATE INDEX "Lot_companyId_itemId_idx" ON "Lot"("companyId", "itemId");

-- CreateIndex
CREATE INDEX "Lot_companyId_expiryDate_idx" ON "Lot"("companyId", "expiryDate");

-- CreateIndex
CREATE INDEX "PickAllocation_companyId_outboundLineId_isReleased_isCommit_idx" ON "PickAllocation"("companyId", "outboundLineId", "isReleased", "isCommitted");

-- CreateIndex
CREATE INDEX "Stock_companyId_warehouseId_idx" ON "Stock"("companyId", "warehouseId");

-- CreateIndex
CREATE INDEX "Stock_companyId_lotId_idx" ON "Stock"("companyId", "lotId");

-- AddForeignKey
ALTER TABLE "OutboundOrder" ADD CONSTRAINT "OutboundOrder_pickedSubmittedByUserId_fkey" FOREIGN KEY ("pickedSubmittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickAllocation" ADD CONSTRAINT "PickAllocation_pickedByUserId_fkey" FOREIGN KEY ("pickedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
