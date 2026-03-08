-- 1. AsnStatus enum 생성
CREATE TYPE "AsnStatus" AS ENUM ('PENDING', 'SHIPPED', 'RECEIVED', 'CANCELLED');

-- 2. Asn 테이블 생성
CREATE TABLE "Asn" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "fromBranchId" TEXT,
    "fromWarehouseId" TEXT,
    "toBranchId" TEXT NOT NULL,
    "toWarehouseId" TEXT NOT NULL,
    "expectedDate" TIMESTAMP(3) NOT NULL,
    "status" "AsnStatus" NOT NULL DEFAULT 'PENDING',
    "createdByUserId" TEXT,
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asn_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Asn_companyId_idx" ON "Asn"("companyId");
CREATE INDEX "Asn_companyId_status_idx" ON "Asn"("companyId", "status");
CREATE INDEX "Asn_toBranchId_idx" ON "Asn"("toBranchId");
CREATE INDEX "Asn_toWarehouseId_idx" ON "Asn"("toWarehouseId");
CREATE INDEX "Asn_expectedDate_idx" ON "Asn"("expectedDate");

ALTER TABLE "Asn" ADD CONSTRAINT "Asn_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Asn" ADD CONSTRAINT "Asn_fromBranchId_fkey" FOREIGN KEY ("fromBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Asn" ADD CONSTRAINT "Asn_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Asn" ADD CONSTRAINT "Asn_toBranchId_fkey" FOREIGN KEY ("toBranchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Asn" ADD CONSTRAINT "Asn_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Asn" ADD CONSTRAINT "Asn_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. AsnLine 테이블 생성
CREATE TABLE "AsnLine" (
    "id" TEXT NOT NULL,
    "asnId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AsnLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AsnLine_asnId_idx" ON "AsnLine"("asnId");
CREATE INDEX "AsnLine_itemId_idx" ON "AsnLine"("itemId");

ALTER TABLE "AsnLine" ADD CONSTRAINT "AsnLine_asnId_fkey" FOREIGN KEY ("asnId") REFERENCES "Asn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AsnLine" ADD CONSTRAINT "AsnLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
