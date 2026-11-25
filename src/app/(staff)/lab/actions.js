"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { syncEncounterBill } from "@/lib/billing";
import { canCollect } from "@/lib/labWorklist";
import { labPaymentStatus } from "@/lib/labPayments";
import { nextAccessionNumber } from "@/lib/receipts";

class LabError extends Error {}

function refresh(encounterId) {
  revalidatePath("/lab");
  revalidatePath(`/consultations/${encounterId}`);
}

export async function collectSample(prevState, formData) {
  const session = await requirePermission("lab.results.write");
  const id = String(formData.get("labRequestId") || "");
  const overrideReason = String(formData.get("overrideReason") ?? "").trim().slice(0, 200) || null;

  const lab = await prisma.labRequest.findUnique({ where: { id }, include: { encounter: { select: { priority: true } } } });
  if (!lab) return { error: "Test not found." };
  if (lab.status !== "REQUESTED") return { error: "The sample has already been collected." };

  const emergency = lab.encounter.priority === "EMERGENCY";
  const payment = await labPaymentStatus(lab);
  const problem = canCollect({ payment, emergency, overrideReason });
  if (problem) return { error: problem };

  let accession;
  try {
    accession = await prisma.$transaction(async (tx) => {
      const number = await nextAccessionNumber(tx);
      const done = await tx.labRequest.updateMany({
        where: { id, status: "REQUESTED" },
        data: {
          status: "SAMPLE_COLLECTED",
          accessionNumber: number,
          sampleCollectedAt: new Date(),
          sampleCollectedById: session.userId,
          unpaidOverrideReason: payment === "PAID" ? null : overrideReason ?? "Emergency patient",
        },
      });
      if (done.count === 0) throw new LabError("Someone else just collected this sample."); // rolls back the number too
      return number;
    });
  } catch (e) {
    if (e instanceof LabError) return { error: e.message };
    throw e;
  }

  await audit({
    action: payment === "PAID" ? "lab.sample_collected" : "lab.sample_collected_unpaid",
    entity: "LabRequest",
    entityId: id,
    userId: session.userId,
    details: { accession, payment, emergency },
  });
  refresh(lab.encounterId);
  return { success: `Sample collected — label the tube ${accession}.` };
}

export async function startTest(prevState, formData) {
  const session = await requirePermission("lab.results.write");
  const id = String(formData.get("labRequestId") || "");
  const lab = await prisma.labRequest.findUnique({ where: { id }, select: { encounterId: true } });
  if (!lab) return { error: "Test not found." };

  const done = await prisma.labRequest.updateMany({
    where: { id, status: "SAMPLE_COLLECTED" },
    data: { status: "IN_PROGRESS", startedAt: new Date() },
  });
  if (done.count === 0) return { error: "This test isn't waiting to start." };

  await audit({ action: "lab.started", entity: "LabRequest", entityId: id, userId: session.userId });
  refresh(lab.encounterId);
  return {};
}

// The lab can cancel at any stage before results (haemolysed sample, wrong tube…).
// The bill line is voided — if already paid, the bill shows a credit for a refund.
export async function cancelLabTest(prevState, formData) {
  const session = await requirePermission("lab.results.write");
  const id = String(formData.get("labRequestId") || "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200);
  if (reason.length < 5) return { error: "Give a reason (at least 5 characters)." };

  const lab = await prisma.labRequest.findUnique({ where: { id }, select: { encounterId: true } });
  if (!lab) return { error: "Test not found." };

  const done = await prisma.labRequest.updateMany({
    where: { id, status: { in: ["REQUESTED", "SAMPLE_COLLECTED", "IN_PROGRESS"] } },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason },
  });
  if (done.count === 0) return { error: "This test can't be cancelled any more." };

  await syncEncounterBill(lab.encounterId);
  await audit({ action: "lab.cancelled_by_lab", entity: "LabRequest", entityId: id, userId: session.userId, details: { reason } });
  refresh(lab.encounterId);
  return { success: "Cancelled. The bill line has been voided." };
}
