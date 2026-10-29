-- CreateTable
CREATE TABLE "Vitals" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "systolic" INTEGER,
    "diastolic" INTEGER,
    "temperature" DOUBLE PRECISION,
    "pulse" INTEGER,
    "respiratoryRate" INTEGER,
    "spo2" INTEGER,
    "weightKg" DOUBLE PRECISION,
    "heightCm" DOUBLE PRECISION,
    "glucose" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vitals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Vitals_patientId_createdAt_idx" ON "Vitals"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "Vitals_encounterId_idx" ON "Vitals"("encounterId");

-- AddForeignKey
ALTER TABLE "Vitals" ADD CONSTRAINT "Vitals_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vitals" ADD CONSTRAINT "Vitals_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vitals" ADD CONSTRAINT "Vitals_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
