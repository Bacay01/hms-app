"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { loadForClinician } from "@/lib/clinician";
import { DRUG_BY_ID, getInteractionGraph } from "@/lib/drugs";
import { LAB_TESTS } from "@/lib/labTests";
import { hasKnownAllergies } from "@/lib/patients";
import { checkPrescription, parsePrescriptionForm, units } from "@/lib/prescribing";

export async function addPrescription(encounterId, prevState, formData) {
  const { session, encounter, error } = await loadForClinician(encounterId, { requireActive: true });
  if (error) return { error };

  const parsed = parsePrescriptionForm(formData);
  if (parsed.error) return { error: parsed.error };
  const { drug, doseQty, frequency, durationDays, quantity, instructions } = parsed.data;

  const current = await prisma.prescription.findMany({
    where: { encounterId, status: { not: "CANCELLED" } },
    select: { drugId: true },
  });
  if (current.some((p) => p.drugId === drug.id)) {
    return { error: `${drug.name} is already prescribed on this visit. Cancel it first to change the dose.` };
  }

  // Same checks the screen showed — re-run on the server, which is the one that counts
  const allergies = hasKnownAllergies(encounter.patient.allergies) ? encounter.patient.allergies : "";
  const currentDrugs = current.map((p) => DRUG_BY_ID.get(p.drugId)).filter(Boolean);
  const issues = checkPrescription({ drug, currentDrugs, allergies }, getInteractionGraph());
  const serious = issues.some((i) => i.severity === "major");

  const override = formData.get("override") === "on";
  const overrideReason = String(formData.get("overrideReason") ?? "").trim().slice(0, 300) || null;
  if (serious && !(override && overrideReason)) {
    return { error: "This prescription has serious warnings. Tick the override and give a reason to continue." };
  }

  const rx = await prisma.prescription.create({
    data: {
      encounterId,
      patientId: encounter.patientId,
      drugId: drug.id,
      drugName: drug.name,
      unit: drug.unit,
      doseQty,
      frequency,
      durationDays,
      quantity,
      instructions,
      alerts: issues.length ? issues : undefined,
      overrideReason: serious ? overrideReason : null,
      prescribedById: session.userId,
    },
  });

  await audit({
    action: serious ? "prescription.add_override" : "prescription.add",
    entity: "Encounter",
    entityId: encounterId,
    userId: session.userId,
    details: { prescriptionId: rx.id, warnings: issues.length },
  });

  revalidatePath(`/consultations/${encounterId}`);
  return { success: `${drug.name} prescribed — ${units(quantity, drug.unit)}.`, savedAt: rx.id };
}

export async function cancelPrescription(prevState, formData) {
  const id = String(formData.get("prescriptionId") || "");
  const rx = await prisma.prescription.findUnique({ where: { id } });
  if (!rx) return { error: "Prescription not found." };
  if (rx.status !== "PENDING") return { error: "Only pending prescriptions can be cancelled." };

  const { session, error } = await loadForClinician(rx.encounterId, { requireActive: true });
  if (error) return { error };

  await prisma.prescription.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
  await audit({
    action: "prescription.cancel",
    entity: "Encounter",
    entityId: rx.encounterId,
    userId: session.userId,
    details: { prescriptionId: id },
  });

  revalidatePath(`/consultations/${rx.encounterId}`);
  return {};
}

export async function requestLab(encounterId, prevState, formData) {
  const { session, encounter, error } = await loadForClinician(encounterId, { requireActive: true });
  if (error) return { error };

  const test = LAB_TESTS.find((t) => t.code === String(formData.get("testCode") || ""));
  if (!test) return { error: "Choose a test." };

  const existing = await prisma.labRequest.findFirst({
    where: { encounterId, testCode: test.code, status: { not: "CANCELLED" } },
  });
  if (existing) return { error: `${test.name} is already requested on this visit.` };

  const lab = await prisma.labRequest.create({
    data: {
      encounterId,
      patientId: encounter.patientId,
      testCode: test.code,
      testName: test.name,
      urgent: formData.get("urgent") === "on",
      clinicalNote: String(formData.get("clinicalNote") ?? "").trim().slice(0, 200) || null,
      requestedById: session.userId,
    },
  });

  await audit({
    action: "lab.request",
    entity: "Encounter",
    entityId: encounterId,
    userId: session.userId,
    details: { labRequestId: lab.id },
  });

  revalidatePath(`/consultations/${encounterId}`);
  return { success: `${test.name} requested.`, savedAt: lab.id };
}

export async function cancelLab(prevState, formData) {
  const id = String(formData.get("labRequestId") || "");
  const lab = await prisma.labRequest.findUnique({ where: { id } });
  if (!lab) return { error: "Lab request not found." };
  if (lab.status !== "REQUESTED") return { error: "The sample has already been taken — the lab must cancel it." };

  const { session, error } = await loadForClinician(lab.encounterId, { requireActive: true });
  if (error) return { error };

  await prisma.labRequest.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
  await audit({
    action: "lab.cancel",
    entity: "Encounter",
    entityId: lab.encounterId,
    userId: session.userId,
    details: { labRequestId: id },
  });

  revalidatePath(`/consultations/${lab.encounterId}`);
  return {};
}
