/*
  Warnings:

  - You are about to drop the column `userId` on the `OutboundOrder` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PickSource" AS ENUM ('AUTO_FEFO', 'MANUAL');

-- DropForeignKey
ALTER TABLE "OutboundOrder" DROP CONSTRAINT "OutboundOrder_userId_fkey";

-- AlterTable
ALTER TABLE "OutboundOrder" DROP COLUMN "userId",
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "deliveredByUserId" TEXT,
ADD COLUMN     "shippingStartedAt" TIMESTAMP(3),
ADD COLUMN     "shippingStartedByUserId" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedByUserId" TEXT;

-- AlterTable
ALTER TABLE "PickAllocation" ADD COLUMN     "source" "PickSource" NOT NULL DEFAULT 'AUTO_FEFO';

-- CreateIndex
CREATE INDEX "OutboundLine_orderId_idx" ON "OutboundLine"("orderId");

-- CreateIndex
CREATE INDEX "OutboundLine_itemId_idx" ON "OutboundLine"("itemId");

-- CreateIndex
CREATE INDEX "OutboundOrder_companyId_status_idx" ON "OutboundOrder"("companyId", "status");

-- CreateIndex
CREATE INDEX "OutboundOrder_companyId_plannedDate_idx" ON "OutboundOrder"("companyId", "plannedDate");

-- CreateIndex
CREATE INDEX "OutboundOrder_companyId_customerId_idx" ON "OutboundOrder"("companyId", "customerId");

-- CreateIndex
CREATE INDEX "PickAllocation_companyId_outboundLineId_idx" ON "PickAllocation"("companyId", "outboundLineId");

-- CreateIndex
CREATE INDEX "PickAllocation_companyId_warehouseId_lotId_idx" ON "PickAllocation"("companyId", "warehouseId", "lotId");

-- AddForeignKey
ALTER TABLE "OutboundOrder" ADD CONSTRAINT "OutboundOrder_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundOrder" ADD CONSTRAINT "OutboundOrder_shippingStartedByUserId_fkey" FOREIGN KEY ("shippingStartedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundOrder" ADD CONSTRAINT "OutboundOrder_deliveredByUserId_fkey" FOREIGN KEY ("deliveredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
