-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "customerCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_companyId_customerName_key" ON "Customer"("companyId", "customerName");
