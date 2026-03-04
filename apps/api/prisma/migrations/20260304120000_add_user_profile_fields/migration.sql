-- AlterTable
ALTER TABLE "User" ADD COLUMN "dateOfBirth" TIMESTAMP(3),
ADD COLUMN "phone" TEXT,
ADD COLUMN "addressLine1" TEXT,
ADD COLUMN "addressLine2" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "stateProvince" TEXT,
ADD COLUMN "postalCode" TEXT,
ADD COLUMN "countryCode" TEXT,
ADD COLUMN "profileImageUrl" TEXT;
