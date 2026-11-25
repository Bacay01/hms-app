"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { canVerify } from "@/lib/labWorklist";

export async function verifyResults(labRequestId, prevState, formData) {
  const session = await requirePermission("lab.results.verify");
  const decision = String(formData.get("decision") || "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || null;
  const seenResultedAt = String(formData.get("resultedAt") || "");

  const lab = await prisma.labRequest.findUnique({
    where: { id: labRequestId },
    select: { status: true, resultedById: true, resultedAt: true, encounterId: true },
  });
  if (!lab) return { error: "Test not found." };

  const problem = canVerify({ status: lab.status, resultedById: lab.resultedById, userId: session.userId });
  if (problem) return { error: problem };

  // Optimistic concurrency: the verifier must be looking at the latest version of the results
  if (!lab.resultedAt || lab.resultedAt.toISOString() !== seenResultedAt) {
    return { error: "Results changed since you opened them — reload the page and check again." };
  }

  if (decision === "RETURN") {
    if (!note) return { error: "Say what needs correcting." };
    const done = await prisma.labRequest.updateMany({
      where: { id: labRequestId, status: "RESULTED", resultedAt: lab.resultedAt },
      data: { status: "IN_PROGRESS", returnNote: note },
    });
    if (done.count === 0) return { error: "Someone else just acted on these results. Reload." };
    await audit({ action: "lab.returned", entity: "LabRequest", entityId: labRequestId, userId: session.userId, details: { note } });
  } else if (decision === "VERIFY") {
    const done = await prisma.labRequest.updateMany({
      where: { id: labRequestId, status: "RESULTED", resultedAt: lab.resultedAt },
      data: { status: "COMPLETED", verifiedAt: new Date(), verifiedById: session.userId, returnNote: null },
    });
    if (done.count === 0) return { error: "Someone else just acted on these results. Reload." };
    await audit({ action: "lab.verified", entity: "LabRequest", entityId: labRequestId, userId: session.userId });
  } else {
    return { error: "Choose verify or return." };
  }

  revalidatePath("/lab");
  revalidatePath(`/lab/${labRequestId}`);
  revalidatePath(`/consultations/${lab.encounterId}`);
  return { success: decision === "VERIFY" ? "Verified and released to the doctor." : "Returned to the bench for correction." };
}
