-- 1. Branch 테이블 생성
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Branch_companyId_code_key" ON "Branch"("companyId", "code");
CREATE INDEX "Branch_companyId_idx" ON "Branch"("companyId");

ALTER TABLE "Branch" ADD CONSTRAINT "Branch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Warehouse에 branchId 컬럼 추가 (nullable 먼저)
ALTER TABLE "Warehouse" ADD COLUMN "branchId" TEXT;

-- 3. Company당 default Branch 1개 생성, 기존 Warehouse를 해당 Branch에 연결
INSERT INTO "Branch" ("id", "companyId", "name", "code", "createdAt", "updatedAt")
SELECT
    gen_random_uuid(),
    c.id,
    c.name || ' (본사)',
    'DEFAULT',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Company" c;

UPDATE "Warehouse" w
SET "branchId" = (
    SELECT b.id
    FROM "Branch" b
    WHERE b."companyId" = w."companyId"
      AND b.code = 'DEFAULT'
    LIMIT 1
);

-- 4. branchId NOT NULL로 변경
ALTER TABLE "Warehouse" ALTER COLUMN "branchId" SET NOT NULL;

-- 5. FK 제약 추가
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. 기존 unique 제약 제거, 새 unique 제약 추가
ALTER TABLE "Warehouse" DROP CONSTRAINT IF EXISTS "Warehouse_companyId_type_region_key";

CREATE UNIQUE INDEX "Warehouse_branchId_type_region_key" ON "Warehouse"("branchId", "type", "region");

-- 7. branchId 인덱스
CREATE INDEX "Warehouse_branchId_idx" ON "Warehouse"("branchId");
