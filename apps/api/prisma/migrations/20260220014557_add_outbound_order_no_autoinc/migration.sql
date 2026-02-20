/*
  Warnings:

  - Added the required column `updatedAt` to the `ReturnReceiptLine` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
CREATE SEQUENCE outboundorder_orderno_seq;
ALTER TABLE "OutboundOrder" ALTER COLUMN "orderNo" SET DEFAULT nextval('outboundorder_orderno_seq');
ALTER SEQUENCE outboundorder_orderno_seq OWNED BY "OutboundOrder"."orderNo";

-- AlterTable
ALTER TABLE "ReturnReceipt" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "completedByUserId" TEXT,
ADD COLUMN     "decidedAt" TIMESTAMP(3),
ADD COLUMN     "decidedByUserId" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "ReturnReceiptLine" ADD COLUMN     "decidedByUserId" TEXT,
ADD COLUMN     "processedByUserId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "ReturnReceiptLine_itemId_expiryDate_idx" ON "ReturnReceiptLine"("itemId", "expiryDate");

-- AddForeignKey
ALTER TABLE "ReturnReceipt" ADD CONSTRAINT "ReturnReceipt_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnReceipt" ADD CONSTRAINT "ReturnReceipt_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnReceiptLine" ADD CONSTRAINT "ReturnReceiptLine_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnReceiptLine" ADD CONSTRAINT "ReturnReceiptLine_processedByUserId_fkey" FOREIGN KEY ("processedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
