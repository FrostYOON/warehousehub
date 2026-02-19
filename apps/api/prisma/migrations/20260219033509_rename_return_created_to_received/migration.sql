/*
  Warnings:

  - You are about to drop the column `createdByUserId` on the `ReturnReceipt` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ReturnReceipt" DROP CONSTRAINT "ReturnReceipt_createdByUserId_fkey";

-- AlterTable
ALTER TABLE "ReturnReceipt" DROP COLUMN "createdByUserId",
ADD COLUMN     "receivedByUserId" TEXT;

-- AddForeignKey
ALTER TABLE "ReturnReceipt" ADD CONSTRAINT "ReturnReceipt_receivedByUserId_fkey" FOREIGN KEY ("receivedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
