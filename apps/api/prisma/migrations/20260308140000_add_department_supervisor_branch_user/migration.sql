-- AlterTable
ALTER TABLE "User" ADD COLUMN "departmentCode" TEXT;
ALTER TABLE "User" ADD COLUMN "supervisorId" TEXT;

-- CreateTable
CREATE TABLE "BranchUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BranchUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BranchUser_userId_branchId_key" ON "BranchUser"("userId", "branchId");
CREATE INDEX "BranchUser_userId_idx" ON "BranchUser"("userId");
CREATE INDEX "BranchUser_branchId_idx" ON "BranchUser"("branchId");
CREATE INDEX "User_supervisorId_idx" ON "User"("supervisorId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BranchUser" ADD CONSTRAINT "BranchUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BranchUser" ADD CONSTRAINT "BranchUser_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
