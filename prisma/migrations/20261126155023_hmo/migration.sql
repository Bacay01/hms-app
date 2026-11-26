-- CreateEnum
CREATE TYPE "AdmissionStatus" AS ENUM ('AWAITING_BED', 'ADMITTED', 'DISCHARGED');

-- CreateEnum
CREATE TYPE "MedicationStatus" AS ENUM ('GIVEN', 'HELD', 'REFUSED');

-- AlterTable
ALTER TABLE "Bill" ADD COLUMN     "enrolmentNo" TEXT,
ADD COLUMN     "grossKobo" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hmoId" TEXT,
ADD COLUMN     "hmoKobo" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hmoPlanName" TEXT;

-- AlterTable
ALTER TABLE "BillItem" ADD COLUMN     "hmoKobo" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "preauthCode" TEXT,
ADD COLUMN     "preauthRequired" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Ward" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT,
    "dailyRateKobo" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bed" (
    "id" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "currentAdmissionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admission" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "status" "AdmissionStatus" NOT NULL DEFAULT 'AWAITING_BED',
    "reason" TEXT,
    "admittingDoctorId" TEXT NOT NULL,
    "admittedAt" TIMESTAMP(3),
    "dischargedAt" TIMESTAMP(3),
    "dischargedById" TEXT,
    "dischargeDiagnosis" TEXT,
    "dischargeSummary" TEXT,
    "followUp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BedStay" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "bedId" TEXT NOT NULL,
    "wardName" TEXT NOT NULL,
    "rateKobo" INTEGER NOT NULL,
    "from" TIMESTAMP(3) NOT NULL,
    "to" TIMESTAMP(3),

    CONSTRAINT "BedStay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NursingNote" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NursingNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationAdministration" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "status" "MedicationStatus" NOT NULL,
    "note" TEXT,
    "givenById" TEXT NOT NULL,
    "givenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicationAdministration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hmo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isNhia" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hmo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HmoPlan" (
    "id" TEXT NOT NULL,
    "hmoId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HmoPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HmoCoverage" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "category" "ServiceCategory" NOT NULL,
    "percent" INTEGER NOT NULL,
    "requiresPreauth" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "HmoCoverage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientHmo" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "enrolmentNumber" TEXT NOT NULL,
    "validUntil" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientHmo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HmoClaim" (
    "id" TEXT NOT NULL,
    "hmoId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "totalKobo" INTEGER NOT NULL,
    "billCount" INTEGER NOT NULL,
    "submittedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HmoClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ward_name_key" ON "Ward"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Bed_currentAdmissionId_key" ON "Bed"("currentAdmissionId");

-- CreateIndex
CREATE UNIQUE INDEX "Bed_wardId_label_key" ON "Bed"("wardId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "Admission_encounterId_key" ON "Admission"("encounterId");

-- CreateIndex
CREATE INDEX "Admission_status_idx" ON "Admission"("status");

-- CreateIndex
CREATE INDEX "BedStay_admissionId_idx" ON "BedStay"("admissionId");

-- CreateIndex
CREATE INDEX "NursingNote_admissionId_createdAt_idx" ON "NursingNote"("admissionId", "createdAt");

-- CreateIndex
CREATE INDEX "MedicationAdministration_admissionId_givenAt_idx" ON "MedicationAdministration"("admissionId", "givenAt");

-- CreateIndex
CREATE UNIQUE INDEX "Hmo_name_key" ON "Hmo"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Hmo_code_key" ON "Hmo"("code");

-- CreateIndex
CREATE UNIQUE INDEX "HmoPlan_hmoId_name_key" ON "HmoPlan"("hmoId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "HmoCoverage_planId_category_key" ON "HmoCoverage"("planId", "category");

-- CreateIndex
CREATE INDEX "PatientHmo_patientId_idx" ON "PatientHmo"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "HmoClaim_hmoId_month_key" ON "HmoClaim"("hmoId", "month");

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_hmoId_fkey" FOREIGN KEY ("hmoId") REFERENCES "Hmo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bed" ADD CONSTRAINT "Bed_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bed" ADD CONSTRAINT "Bed_currentAdmissionId_fkey" FOREIGN KEY ("currentAdmissionId") REFERENCES "Admission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_admittingDoctorId_fkey" FOREIGN KEY ("admittingDoctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_dischargedById_fkey" FOREIGN KEY ("dischargedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BedStay" ADD CONSTRAINT "BedStay_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BedStay" ADD CONSTRAINT "BedStay_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "Bed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NursingNote" ADD CONSTRAINT "NursingNote_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NursingNote" ADD CONSTRAINT "NursingNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationAdministration" ADD CONSTRAINT "MedicationAdministration_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationAdministration" ADD CONSTRAINT "MedicationAdministration_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationAdministration" ADD CONSTRAINT "MedicationAdministration_givenById_fkey" FOREIGN KEY ("givenById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HmoPlan" ADD CONSTRAINT "HmoPlan_hmoId_fkey" FOREIGN KEY ("hmoId") REFERENCES "Hmo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HmoCoverage" ADD CONSTRAINT "HmoCoverage_planId_fkey" FOREIGN KEY ("planId") REFERENCES "HmoPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientHmo" ADD CONSTRAINT "PatientHmo_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientHmo" ADD CONSTRAINT "PatientHmo_planId_fkey" FOREIGN KEY ("planId") REFERENCES "HmoPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HmoClaim" ADD CONSTRAINT "HmoClaim_hmoId_fkey" FOREIGN KEY ("hmoId") REFERENCES "Hmo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
