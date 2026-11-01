-- CreateTable
CREATE TABLE "ClinicalNote" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "presentingComplaint" TEXT,
    "history" TEXT,
    "examination" TEXT,
    "plan" TEXT,
    "amendReason" TEXT,
    "previousId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicalNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Diagnosis" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "provisional" BOOLEAN NOT NULL DEFAULT false,
    "addedById" TEXT NOT NULL,
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Diagnosis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalNote_previousId_key" ON "ClinicalNote"("previousId");

-- CreateIndex
CREATE INDEX "ClinicalNote_encounterId_idx" ON "ClinicalNote"("encounterId");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalNote_encounterId_version_key" ON "ClinicalNote"("encounterId", "version");

-- CreateIndex
CREATE INDEX "Diagnosis_encounterId_idx" ON "Diagnosis"("encounterId");

-- CreateIndex
CREATE INDEX "Diagnosis_code_idx" ON "Diagnosis"("code");

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_previousId_fkey" FOREIGN KEY ("previousId") REFERENCES "ClinicalNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
