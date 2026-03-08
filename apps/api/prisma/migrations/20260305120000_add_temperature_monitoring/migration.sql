-- AlterTable: Company - 회사/창고 주소 (날씨 조회용)
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "postalCode" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "lat" DECIMAL(10,7);
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "lng" DECIMAL(10,7);

-- CreateTable: TemperatureLog - 온도·날씨 모니터링 로그
CREATE TABLE IF NOT EXISTS "TemperatureLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationLat" DECIMAL(10,7),
    "locationLng" DECIMAL(10,7),
    "weatherTemp" DECIMAL(5,2),
    "coolTemp" DECIMAL(5,2),
    "coolOk" BOOLEAN,
    "frzTemp" DECIMAL(5,2),
    "frzOk" BOOLEAN,
    "recordedByUserId" TEXT,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemperatureLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TemperatureLog_companyId_idx" ON "TemperatureLog"("companyId");
CREATE INDEX IF NOT EXISTS "TemperatureLog_companyId_createdAt_idx" ON "TemperatureLog"("companyId", "createdAt");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TemperatureLog_companyId_fkey'
    ) THEN
        ALTER TABLE "TemperatureLog" ADD CONSTRAINT "TemperatureLog_companyId_fkey"
            FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TemperatureLog_recordedByUserId_fkey'
    ) THEN
        ALTER TABLE "TemperatureLog" ADD CONSTRAINT "TemperatureLog_recordedByUserId_fkey"
            FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
