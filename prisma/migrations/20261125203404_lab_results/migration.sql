-- AlterTable
ALTER TABLE "LabRequest" ADD COLUMN     "resultComment" TEXT,
ADD COLUMN     "resultedAt" TIMESTAMP(3),
ADD COLUMN     "resultedById" TEXT;

-- CreateTable
CREATE TABLE "LabResult" (
    "id" TEXT NOT NULL,
    "labRequestId" TEXT NOT NULL,
    "analyteCode" TEXT NOT NULL,
    "analyteName" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "numericValue" DOUBLE PRECISION,
    "unit" TEXT,
    "refLow" DOUBLE PRECISION,
    "refHigh" DOUBLE PRECISION,
    "refText" TEXT,
    "flag" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LabResult_labRequestId_analyteCode_key" ON "LabResult"("labRequestId", "analyteCode");

-- AddForeignKey
ALTER TABLE "LabRequest" ADD CONSTRAINT "LabRequest_resultedById_fkey" FOREIGN KEY ("resultedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_labRequestId_fkey" FOREIGN KEY ("labRequestId") REFERENCES "LabRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
