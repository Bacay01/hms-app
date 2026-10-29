"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { can } from "@/lib/nav";
import { ACTIVE_STATUSES } from "@/lib/queue";
import { parseVitalsForm } from "@/lib/vitals";

export async function recordVitals(encounterId, prevState, formData) {
  const session = await requireSession();
  if (!can(session.permissions, "vitals.write")) return { error: "Your role can't record vitals." };

  const encounter = await prisma.encounter.findUnique({
    where: { id: encounterId },
    select: { id: true, patientId: true, status: true },
  });
  if (!encounter) return { error: "Visit not found." };
  if (!ACTIVE_STATUSES.includes(encounter.status)) return { error: "This visit has ended." };

  const { data, error } = parseVitalsForm(formData);
  if (error) return { error };

  const vitals = await prisma.vitals.create({
    data: { ...data, encounterId: encounter.id, patientId: encounter.patientId, recordedById: session.userId },
  });

  // Log that vitals were recorded — never the values (health data)
  await audit({
    action: "vitals.record",
    entity: "Encounter",
    entityId: encounter.id,
    userId: session.userId,
    details: { vitalsId: vitals.id },
  });

  revalidatePath(`/consultations/${encounter.id}`);
  revalidatePath("/consultations");
  return { success: "Vitals recorded.", savedAt: vitals.id };
}
