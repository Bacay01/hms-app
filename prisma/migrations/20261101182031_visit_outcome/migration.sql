-- CreateEnum
CREATE TYPE "EncounterOutcome" AS ENUM ('DISCHARGED', 'REFERRED', 'ADMITTED');

-- AlterTable
ALTER TABLE "Encounter" ADD COLUMN     "outcome" "EncounterOutcome",
ADD COLUMN     "outcomeNote" TEXT,
ADD COLUMN     "referredTo" TEXT;
