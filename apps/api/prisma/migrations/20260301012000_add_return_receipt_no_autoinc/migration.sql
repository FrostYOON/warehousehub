-- Add sequence and human-friendly receipt number for returns
CREATE SEQUENCE IF NOT EXISTS returnreceipt_receiptno_seq;

ALTER TABLE "ReturnReceipt"
ADD COLUMN "receiptNo" INTEGER;

UPDATE "ReturnReceipt"
SET "receiptNo" = nextval('returnreceipt_receiptno_seq')
WHERE "receiptNo" IS NULL;

ALTER TABLE "ReturnReceipt"
ALTER COLUMN "receiptNo" SET NOT NULL,
ALTER COLUMN "receiptNo" SET DEFAULT nextval('returnreceipt_receiptno_seq');

ALTER SEQUENCE returnreceipt_receiptno_seq OWNED BY "ReturnReceipt"."receiptNo";

CREATE UNIQUE INDEX "ReturnReceipt_receiptNo_key" ON "ReturnReceipt"("receiptNo");
