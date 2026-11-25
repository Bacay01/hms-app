/*
  Warnings:

  - A unique constraint covering the columns `[accessionNumber]` on the table `LabRequest` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LabRequestStatus" ADD VALUE 'IN_PROGRESS';
ALTER TYPE "LabRequestStatus" ADD VALUE 'RESULTED';

-- AlterTable
ALTER TABLE "LabRequest" ADD COLUMN     "accessionNumber" TEXT,
ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "sampleCollectedAt" TIMESTAMP(3),
ADD COLUMN     "sampleCollectedById" TEXT,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "unpaidOverrideReason" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "LabRequest_accessionNumber_key" ON "LabRequest"("accessionNumber");

-- AddForeignKey
ALTER TABLE "LabRequest" ADD CONSTRAINT "LabRequest_sampleCollectedById_fkey" FOREIGN KEY ("sampleCollectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
