-- CreateTable
CREATE TABLE "SimulatedGatewayCharge" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "chargedKobo" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulatedGatewayCharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SimulatedGatewayCharge_reference_key" ON "SimulatedGatewayCharge"("reference");
