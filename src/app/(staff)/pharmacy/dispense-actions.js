"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { DRUG_BY_ID } from "@/lib/drugs";
import { planDispense } from "@/lib/dispensing";
import { canCollect } from "@/lib/labWorklist";
import { orderPaymentStatus } from "@/lib/labPayments";
import { units } from "@/lib/prescribing";
import { localDate } from "@/lib/time";

class DispenseError extends Error {}

export async function dispensePrescription(prevState, formData) {
  const session = await requirePermission("pharmacy.dispense");
  const id = String(formData.get("prescriptionId") || "");
  const overrideReason = String(formData.get("overrideReason") ?? "").trim().slice(0, 200) || null;

  const rx = await prisma.prescription.findUnique({
    where: { id },
    include: { encounter: { select: { priority: true } }, patient: { select: { hospitalNumber: true } } },
  });
  if (!rx) return { error: "Prescription not found." };
  if (rx.status !== "PENDING") return { error: `This prescription is already ${rx.status.toLowerCase()}.` };

  const drug = DRUG_BY_ID.get(rx.drugId);
  const emergency = rx.encounter.priority === "EMERGENCY";
  const payment = await orderPaymentStatus({ id: rx.id, encounterId: rx.encounterId });
  const problem = canCollect({ payment, emergency, overrideReason });
  if (problem) return { error: problem.replace("go ahead", "dispense") };

  let picks;
  try {
    picks = await prisma.$transaction(
      async (tx) => {
        // Lock the prescription and this drug's batches: two pharmacists can't dispense the same stock
        await tx.$queryRaw`SELECT id FROM "Prescription" WHERE id = ${id} FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM "StockBatch" WHERE "drugId" = ${rx.drugId} FOR UPDATE`;

        const fresh = await tx.prescription.findUnique({ where: { id }, select: { status: true } });
        if (fresh.status !== "PENDING") throw new DispenseError("Someone else just dispensed this prescription.");

        const batches = await tx.stockBatch.findMany({
          where: { drugId: rx.drugId, quantityOnHand: { gt: 0 } },
          select: { id: true, batchNumber: true, expiryDate: true, quantityOnHand: true, createdAt: true },
        });

        const plan = planDispense(batches, rx.quantity, localDate(), drug?.unit ?? rx.unit);
        if (plan.error) throw new DispenseError(plan.error);

        for (const pick of plan.picks) {
          await tx.stockBatch.update({ where: { id: pick.batchId }, data: { quantityOnHand: { decrement: pick.quantity } } });
          await tx.stockMovement.create({
            data: {
              batchId: pick.batchId,
              drugId: rx.drugId,
              type: "DISPENSED",
              quantity: -pick.quantity,
              prescriptionId: rx.id,
              reason: `Prescription for ${rx.patient.hospitalNumber}`,
              userId: session.userId,
            },
          });
        }

        await tx.prescription.update({
          where: { id },
          data: {
            status: "DISPENSED",
            dispensedAt: new Date(),
            dispensedById: session.userId,
            unpaidOverrideReason: payment === "PAID" ? null : overrideReason ?? "Emergency patient",
          },
        });
        return plan.picks;
      },
      { timeout: 20_000 }
    );
  } catch (e) {
    if (e instanceof DispenseError) return { error: e.message };
    throw e;
  }

  await audit({
    action: payment === "PAID" ? "rx.dispensed" : "rx.dispensed_unpaid",
    entity: "Prescription",
    entityId: id,
    userId: session.userId,
    details: { drugId: rx.drugId, quantity: rx.quantity, batches: picks.map((p) => `${p.batchNumber}:${p.quantity}`), payment },
  });

  revalidatePath("/pharmacy");
  revalidatePath("/pharmacy/stock");
  revalidatePath(`/pharmacy/stock/${rx.drugId}`);
  revalidatePath(`/consultations/${rx.encounterId}`);
  return {
    success: `Dispensed ${units(rx.quantity, rx.unit)} of ${rx.drugName}: ${picks.map((p) => `${p.quantity} from ${p.batchNumber}`).join(", ")}.`,
  };
}
