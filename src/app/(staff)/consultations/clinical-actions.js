"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { can } from "@/lib/nav";
import { ACTIVE_STATUSES } from "@/lib/queue";
import { DIAGNOSES } from "@/lib/diagnoses";
import { NOTE_FIELDS } from "@/lib/noteHistory";

const MAX_SECTION = 5000;

// Doctors write clinical records, and only for their own patients
async function loadForClinician(encounterId) {
  const session = await requireSession();
  if (!can(session.permissions, "clinical.write")) return { error: "Only doctors can write clinical records." };

  const encounter = await prisma.encounter.findUnique({
    where: { id: encounterId },
    select: { id: true, status: true, doctorId: true },
  });
  if (!encounter) return { error: "Visit not found." };
  if (session.role === "DOCTOR" && encounter.doctorId !== session.userId) {
    return { error: "This visit belongs to another doctor." };
  }
  return { session, encounter };
}

export async function saveClinicalNote(encounterId, prevState, formData) {
  const { session, encounter, error } = await loadForClinician(encounterId);
  if (error) return { error };

  const fields = {};
  for (const { key } of NOTE_FIELDS) {
    fields[key] = String(formData.get(key) ?? "").trim().slice(0, MAX_SECTION) || null;
  }
  if (NOTE_FIELDS.every(({ key }) => !fields[key])) return { error: "Write at least one section." };

  const baseId = String(formData.get("baseId") || "") || null;
  const amendReason = String(formData.get("amendReason") ?? "").trim().slice(0, 300) || null;

  // The head of the linked list = latest version
  const latest = await prisma.clinicalNote.findFirst({ where: { encounterId }, orderBy: { version: "desc" } });

  // Optimistic concurrency: you must be editing the version that is still the latest
  if ((latest?.id ?? null) !== baseId) {
    return { error: "Someone else updated this note while you were editing. Reload to see the latest version." };
  }
  if (latest && NOTE_FIELDS.every(({ key }) => (latest[key] ?? null) === fields[key])) {
    return { error: "Nothing has changed." };
  }
  const visitEnded = !ACTIVE_STATUSES.includes(encounter.status);
  if (latest && visitEnded && !amendReason) {
    return { error: "This visit has ended — give a reason for the amendment." };
  }

  let note;
  try {
    note = await prisma.clinicalNote.create({
      data: {
        ...fields,
        encounterId,
        authorId: session.userId,
        version: (latest?.version ?? 0) + 1,
        previousId: latest?.id ?? null, // link to the previous version
        amendReason: latest ? amendReason : null,
      },
    });
  } catch (e) {
    if (e?.code === "P2002") return { error: "Someone else saved a new version at the same moment. Reload to see it." };
    throw e;
  }

  await audit({
    action: latest ? "note.amend" : "note.create",
    entity: "Encounter",
    entityId: encounterId,
    userId: session.userId,
    details: { noteId: note.id, version: note.version },
  });

  revalidatePath(`/consultations/${encounterId}`);
  return { success: latest ? `Saved as version ${note.version}.` : "Note saved.", savedAt: note.id };
}

export async function addDiagnosis(encounterId, prevState, formData) {
  const { session, error } = await loadForClinician(encounterId);
  if (error) return { error };

  const code = String(formData.get("code") || "").trim() || null;
  let name = String(formData.get("name") || "").trim().slice(0, 200);
  const provisional = formData.get("provisional") === "on";
  const wantsPrimary = formData.get("primary") === "on";

  if (code) {
    const known = DIAGNOSES.find((d) => d.code === code);
    if (!known) return { error: "Unknown diagnosis code." };
    name = known.name;
  }
  if (!name) return { error: "Choose a diagnosis or type one." };

  const active = await prisma.diagnosis.findMany({
    where: { encounterId, removedAt: null },
    select: { code: true, name: true },
  });
  const duplicate = active.some((d) => (code ? d.code === code : d.name.toLowerCase() === name.toLowerCase()));
  if (duplicate) return { error: "That diagnosis is already on this visit." };

  // The first diagnosis is primary automatically
  const isPrimary = wantsPrimary || active.length === 0;

  const [, diagnosis] = await prisma.$transaction([
    prisma.diagnosis.updateMany({
      where: { encounterId, removedAt: null, ...(isPrimary ? {} : { id: "__none__" }) },
      data: { isPrimary: false },
    }),
    prisma.diagnosis.create({
      data: { encounterId, code, name, provisional, isPrimary, addedById: session.userId },
    }),
  ]);

  await audit({
    action: "diagnosis.add",
    entity: "Encounter",
    entityId: encounterId,
    userId: session.userId,
    details: { diagnosisId: diagnosis.id },
  });

  revalidatePath(`/consultations/${encounterId}`);
  return { success: "Diagnosis added.", savedAt: diagnosis.id };
}

export async function removeDiagnosis(prevState, formData) {
  const diagnosisId = String(formData.get("diagnosisId") || "");
  const diagnosis = await prisma.diagnosis.findUnique({ where: { id: diagnosisId } });
  if (!diagnosis || diagnosis.removedAt) return { error: "Diagnosis not found." };

  const { session, error } = await loadForClinician(diagnosis.encounterId);
  if (error) return { error };

  await prisma.diagnosis.update({ where: { id: diagnosisId }, data: { removedAt: new Date(), isPrimary: false } });

  // If the primary was removed, promote the oldest remaining diagnosis
  if (diagnosis.isPrimary) {
    const next = await prisma.diagnosis.findFirst({
      where: { encounterId: diagnosis.encounterId, removedAt: null },
      orderBy: { createdAt: "asc" },
    });
    if (next) await prisma.diagnosis.update({ where: { id: next.id }, data: { isPrimary: true } });
  }

  await audit({
    action: "diagnosis.remove",
    entity: "Encounter",
    entityId: diagnosis.encounterId,
    userId: session.userId,
    details: { diagnosisId },
  });

  revalidatePath(`/consultations/${diagnosis.encounterId}`);
  return {};
}
