"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { loadForClinician } from "@/lib/clinician";

const OUTCOMES = ["DISCHARGED", "REFERRED", "ADMITTED"];

function refresh(encounterId) {
  revalidatePath(`/consultations/${encounterId}`);
  revalidatePath("/consultations");
  revalidatePath("/appointments");
  revalidatePath("/display");
}

export async function startConsultation(encounterId, prevState, formData) {
  const { session, encounter, error } = await loadForClinician(encounterId, { requireActive: true });
  if (error) return { error };
  if (encounter.status === "WITH_DOCTOR") return {};

  // Conditional update — fails safely if someone else moved the patient first
  const result = await prisma.encounter.updateMany({
    where: { id: encounterId, status: { in: ["WAITING", "WITH_NURSE"] } },
    data: { status: "WITH_DOCTOR", doctorAt: new Date() },
  });
  if (result.count === 0) return { error: "This visit was just updated by someone else. Reload the page." };

  await audit({
    action: "encounter.start_consultation",
    entity: "Encounter",
    entityId: encounterId,
    userId: session.userId,
    details: { from: encounter.status, to: "WITH_DOCTOR" },
  });

  refresh(encounterId);
  return {};
}

export async function completeVisit(encounterId, prevState, formData) {
  const { session, encounter, error } = await loadForClinician(encounterId, { requireActive: true });
  if (error) return { error };
  if (encounter.status !== "WITH_DOCTOR") return { error: "Start the consultation first." };

  const outcome = String(formData.get("outcome") || "");
  const outcomeNote = String(formData.get("outcomeNote") ?? "").trim().slice(0, 500) || null;
  const referredTo = String(formData.get("referredTo") ?? "").trim().slice(0, 150) || null;

  if (!OUTCOMES.includes(outcome)) return { error: "Choose an outcome." };
  if (outcome === "REFERRED" && !referredTo) return { error: "Say where the patient is being referred to." };

  // A visit can't end without a clinical record
  const [notes, diagnoses] = await Promise.all([
    prisma.clinicalNote.count({ where: { encounterId } }),
    prisma.diagnosis.count({ where: { encounterId, removedAt: null } }),
  ]);
  if (notes === 0) return { error: "Write a clinical note before completing the visit." };
  if (diagnoses === 0) return { error: "Add at least one diagnosis (provisional is fine) before completing the visit." };

  const result = await prisma.encounter.updateMany({
    where: { id: encounterId, status: "WITH_DOCTOR" },
    data: {
      status: "COMPLETED",
      endedAt: new Date(),
      outcome,
      outcomeNote,
      referredTo: outcome === "REFERRED" ? referredTo : null,
    },
  });
  if (result.count === 0) return { error: "This visit was just updated by someone else. Reload the page." };

  await audit({
    action: "encounter.complete",
    entity: "Encounter",
    entityId: encounterId,
    userId: session.userId,
    details: { outcome },
  });

  refresh(encounterId);
  return {};
}
