
/*
  Notes:
  - We add OutboundOrder.orderNo as a globally increasing integer.
  - This migration is safe for non-empty tables:
    1) add column as NULLable
    2) backfill using a sequence
    3) set NOT NULL
    4) set DEFAULT nextval(...) for future inserts
*/

-- 1) Create a global sequence (no company scoping)
CREATE SEQUENCE IF NOT EXISTS outbound_order_no_seq;

-- 2) Add column as nullable first (safe if table already has rows)
ALTER TABLE "OutboundOrder" ADD COLUMN IF NOT EXISTS "orderNo" INTEGER;

-- 3) Backfill existing rows (if any) with unique increasing values
--    Only fills rows where orderNo is NULL.
UPDATE "OutboundOrder"
SET "orderNo" = nextval('outbound_order_no_seq')
WHERE "orderNo" IS NULL;

DO $$
DECLARE
  max_no BIGINT;
BEGIN
  SELECT COALESCE(MAX("orderNo"), 0) INTO max_no FROM "OutboundOrder";

  -- If there are no rows yet, set sequence to 1 but mark it as not-called
  -- so that nextval() returns 1 on the first insert.
  IF max_no <= 0 THEN
    PERFORM setval('outbound_order_no_seq', 1, false);
  ELSE
    -- If there are existing rows, advance sequence to current max so nextval() returns max+1.
    PERFORM setval('outbound_order_no_seq', max_no, true);
  END IF;
END $$;

-- 5) Set NOT NULL + DEFAULT for future inserts
ALTER TABLE "OutboundOrder" ALTER COLUMN "orderNo" SET DEFAULT nextval('outbound_order_no_seq');
ALTER TABLE "OutboundOrder" ALTER COLUMN "orderNo" SET NOT NULL;

-- 6) Unique index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'OutboundOrder_orderNo_key'
  ) THEN
    CREATE UNIQUE INDEX "OutboundOrder_orderNo_key" ON "OutboundOrder"("orderNo");
  END IF;
END $$;
