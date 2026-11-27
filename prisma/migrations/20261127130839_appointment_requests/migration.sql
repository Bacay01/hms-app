-- CreateEnum
CREATE TYPE "AppointmentRequestStatus" AS ENUM ('NEW', 'BOOKED', 'DECLINED');

-- CreateTable
CREATE TABLE "AppointmentRequest" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "departmentId" TEXT,
    "preferredDate" DATE NOT NULL,
    "preferredTime" TEXT NOT NULL,
    "reason" TEXT,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentRequestStatus" NOT NULL DEFAULT 'NEW',
    "staffNote" TEXT,
    "handledById" TEXT,
    "handledAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppointmentRequest_status_createdAt_idx" ON "AppointmentRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AppointmentRequest_phone_status_idx" ON "AppointmentRequest"("phone", "status");
