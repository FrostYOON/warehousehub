/*
  Warnings:

  - The values [CONFIRMED] on the enum `OutboundStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "OutboundStatus_new" AS ENUM ('DRAFT', 'PICKING', 'PICKED', 'READY_TO_SHIP', 'SHIPPING', 'DELIVERED', 'CANCELLED');
ALTER TABLE "public"."OutboundOrder" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "OutboundOrder" ALTER COLUMN "status" TYPE "OutboundStatus_new" USING ("status"::text::"OutboundStatus_new");
ALTER TYPE "OutboundStatus" RENAME TO "OutboundStatus_old";
ALTER TYPE "OutboundStatus_new" RENAME TO "OutboundStatus";
DROP TYPE "public"."OutboundStatus_old";
ALTER TABLE "OutboundOrder" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;
