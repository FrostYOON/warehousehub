-- AlterTable
ALTER TABLE "OutboundOrder" ALTER COLUMN "orderNo" DROP DEFAULT;
DROP SEQUENCE "outbound_order_no_seq";
