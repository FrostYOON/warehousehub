-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('RECEIVED', 'DECIDED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReturnLineDecision" AS ENUM ('RESTOCK', 'DISCARD');

-- CreateTable
CREATE TABLE "ReturnReceipt" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ReturnStatus" NOT NULL DEFAULT 'RECEIVED',
    "memo" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnReceiptLine" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "storageType" "StorageType" NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "qty" INTEGER NOT NULL,
    "decision" "ReturnLineDecision",
    "decidedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnReceiptLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReturnReceipt_companyId_status_idx" ON "ReturnReceipt"("companyId", "status");

-- CreateIndex
CREATE INDEX "ReturnReceipt_companyId_receivedAt_idx" ON "ReturnReceipt"("companyId", "receivedAt");

-- CreateIndex
CREATE INDEX "ReturnReceipt_companyId_customerId_idx" ON "ReturnReceipt"("companyId", "customerId");

-- CreateIndex
CREATE INDEX "ReturnReceiptLine_receiptId_idx" ON "ReturnReceiptLine"("receiptId");

-- CreateIndex
CREATE INDEX "ReturnReceiptLine_itemId_idx" ON "ReturnReceiptLine"("itemId");

-- AddForeignKey
ALTER TABLE "ReturnReceipt" ADD CONSTRAINT "ReturnReceipt_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnReceipt" ADD CONSTRAINT "ReturnReceipt_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnReceipt" ADD CONSTRAINT "ReturnReceipt_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnReceiptLine" ADD CONSTRAINT "ReturnReceiptLine_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "ReturnReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnReceiptLine" ADD CONSTRAINT "ReturnReceiptLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
