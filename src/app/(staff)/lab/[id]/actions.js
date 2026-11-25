"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { analytesFor } from "@/lib/labCatalogue";
import { FLAG_LABELS, evaluateResult, isCritical, parseResult } from "@/lib/labRanges";
import { ageFrom } from "@/lib/patients";

export async function saveResults(labRequestId, prevState, formData) {
  const session = await requirePermission("lab.results.write");

  const lab = await prisma.labRequest.findUnique({
    where: { id: labRequestId },
    include: { patient: { select: { sex: true, dateOfBirth: true } } },
  });
  if (!lab) return { error: "Test not found." };
  if (!["IN_PROGRESS", "RESULTED"].includes(lab.status)) {
    return { error: lab.status === "COMPLETED" ? "These results are verified and released — they can't be changed." : "Start the test first." };
  }

  const who = { sex: lab.patient.sex, age: ageFrom(lab.patient.dateOfBirth) };
  const rows = [];
  for (const analyte of analytesFor(lab.testCode)) {
    const parsed = parseResult(analyte, formData.get(analyte.code));
    if (parsed.error) return { error: parsed.error };
    if (analyte.type === "text" && !parsed.value) continue; // optional free text

    const evaluated = evaluateResult(analyte, parsed.value, who);
    rows.push({
      labRequestId,
      analyteCode: analyte.code,
      analyteName: analyte.name,
      value: parsed.value,
      unit: analyte.unit ?? null,
      ...evaluated,
    });
  }
  if (rows.length === 0) return { error: "Enter at least one result." };

  const comment = String(formData.get("comment") ?? "").trim().slice(0, 500) || null;
  const amending = lab.status === "RESULTED";

  await prisma.$transaction([
    prisma.labResult.deleteMany({ where: { labRequestId } }),
    prisma.labResult.createMany({ data: rows }),
    prisma.labRequest.update({
      where: { id: labRequestId },
      data: { status: "RESULTED", resultedAt: new Date(), resultedById: session.userId, resultComment: comment, returnNote: null },
    }),
  ]);

  const critical = rows.filter((r) => isCritical(r.flag));
  await audit({
    action: amending ? "lab.results_amended" : "lab.results_entered",
    entity: "LabRequest",
    entityId: labRequestId,
    userId: session.userId,
    details: { analytes: rows.length, flagged: rows.filter((r) => r.flag).length, critical: critical.length },
  });
  if (critical.length) {
    await audit({
      action: "lab.critical_result",
      entity: "LabRequest",
      entityId: labRequestId,
      userId: session.userId,
      details: { analytes: critical.map((r) => r.analyteCode) },
    });
  }

  revalidatePath("/lab");
  revalidatePath(`/lab/${labRequestId}`);
  revalidatePath(`/consultations/${lab.encounterId}`);
  return {
    success: amending ? "Results updated — awaiting verification." : "Results saved — awaiting verification by a second scientist.",
    critical: critical.map((r) => `${r.analyteName}: ${r.value} ${r.unit ?? ""} (${FLAG_LABELS[r.flag]})`),
    savedAt: Date.now(),
  };
}
