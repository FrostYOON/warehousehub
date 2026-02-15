-- CreateEnum
CREATE TYPE "InboundUploadStatus" AS ENUM ('UPLOADED', 'CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "InboundUpload" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "uploadedByUserId" TEXT,
    "fileName" TEXT NOT NULL,
    "status" "InboundUploadStatus" NOT NULL DEFAULT 'UPLOADED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "InboundUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboundUploadRow" (
    "id" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "storageType" "StorageType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboundUploadRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InboundUpload_companyId_status_idx" ON "InboundUpload"("companyId", "status");

-- CreateIndex
CREATE INDEX "InboundUpload_companyId_createdAt_idx" ON "InboundUpload"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "InboundUploadRow_uploadId_idx" ON "InboundUploadRow"("uploadId");

-- CreateIndex
CREATE INDEX "InboundUploadRow_itemCode_idx" ON "InboundUploadRow"("itemCode");

-- AddForeignKey
ALTER TABLE "InboundUpload" ADD CONSTRAINT "InboundUpload_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundUpload" ADD CONSTRAINT "InboundUpload_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundUploadRow" ADD CONSTRAINT "InboundUploadRow_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "InboundUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;
