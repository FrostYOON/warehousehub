-- AlterTable
ALTER TABLE "Company" ADD COLUMN "logoUrl" TEXT;
ALTER TABLE "Company" ADD COLUMN "brandPrimaryColor" TEXT;

-- CreateTable
CREATE TABLE "UserDashboardPrefs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "widgetOrder" TEXT NOT NULL,
    "widgetVisibility" TEXT NOT NULL,
    "widgetCollapsed" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDashboardPrefs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserDashboardPrefs_userId_key" ON "UserDashboardPrefs"("userId");
CREATE INDEX "UserDashboardPrefs_userId_idx" ON "UserDashboardPrefs"("userId");

-- AddForeignKey
ALTER TABLE "UserDashboardPrefs" ADD CONSTRAINT "UserDashboardPrefs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
