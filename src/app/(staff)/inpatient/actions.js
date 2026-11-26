"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { can } from "@/lib/nav";
import { syncEncounterBill } from "@/lib/billing";

class WardError extends Error {}

async function requirePerm(permission, message) {
  const session = await requireSession();
  if (!can(session.permissions, permission)) throw new WardError(message);
  return session;
}

function refresh(admission) {
  revalidatePath("/inpatient");
  revalidatePath(`/inpatient/${admission.id}`);
  revalidatePath(`/consultations/${admission.encounterId}`);
}

// Admit into a bed (from "awaiting a bed") or transfer to another bed
export async function moveToBed(admissionId, prevState, formData) {
  try {
    const session = await requirePerm("vitals.write", "Only nurses and doctors can move patients.");
    const bedId = String(formData.get("bedId") || "");

    const admission = await prisma.admission.findUnique({ where: { id: admissionId }, include: { occupiedBed: { select: { id: true } } } });
    if (!admission || admission.status === "DISCHARGED") throw new WardError("This admission is closed.");
    if (admission.occupiedBed?.id === bedId) throw new WardError("The patient is already in that bed.");

    const bed = await prisma.bed.findUnique({ where: { id: bedId }, include: { ward: true } });
    if (!bed || !bed.isActive || !bed.ward.isActive) throw new WardError("Choose an available bed.");

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      // Claim the bed ONLY if it's still empty — the unique column makes double-booking impossible
      const claimed = await tx.bed.updateMany({ where: { id: bedId, currentAdmissionId: null }, data: { currentAdmissionId: admission.id } });
      if (claimed.count === 0) throw new WardError("That bed was just taken — choose another.");

      if (admission.occupiedBed) {
        await tx.bed.update({ where: { id: admission.occupiedBed.id }, data: { currentAdmissionId: null } });
        await tx.bedStay.updateMany({ where: { admissionId, to: null }, data: { to: now } });
      }
      await tx.bedStay.create({ data: { admissionId, bedId, wardName: bed.ward.name, rateKobo: bed.ward.dailyRateKobo, from: now } });
      await tx.admission.update({ where: { id: admissionId }, data: { status: "ADMITTED", admittedAt: admission.admittedAt ?? now } });
    });

    await audit({
      action: admission.occupiedBed ? "inpatient.transferred" : "inpatient.admitted",
      entity: "Admission",
      entityId: admissionId,
      userId: session.userId,
      details: { ward: bed.ward.name, bed: bed.label },
    });
    await syncEncounterBill(admission.encounterId);
    refresh(admission);
    return { success: `${admission.occupiedBed ? "Transferred" : "Admitted"} to ${bed.ward.name}, ${bed.label}.` };
  } catch (e) {
    if (e instanceof WardError) return { error: e.message };
    throw e;
  }
}

export async function addNursingNote(admissionId, prevState, formData) {
  try {
    const session = await requirePerm("vitals.write", "Only nurses and doctors can write nursing notes.");
    const note = String(formData.get("note") || "").trim().slice(0, 1000);
    if (note.length < 3) throw new WardError("Write the note first.");

    const admission = await prisma.admission.findUnique({ where: { id: admissionId }, select: { id: true, status: true, encounterId: true } });
    if (!admission || admission.status !== "ADMITTED") throw new WardError("Notes can only be added while the patient is on the ward.");

    await prisma.nursingNote.create({ data: { admissionId, authorId: session.userId, note } });
    await audit({ action: "inpatient.nursing_note", entity: "Admission", entityId: admissionId, userId: session.userId });
    refresh(admission);
    return { savedAt: Date.now() };
  } catch (e) {
    if (e instanceof WardError) return { error: e.message };
    throw e;
  }
}

export async function recordMedication(admissionId, prevState, formData) {
  try {
    const session = await requirePerm("vitals.write", "Only nurses and doctors can chart medication.");
    const prescriptionId = String(formData.get("prescriptionId") || "");
    const status = String(formData.get("status") || "");
    const note = String(formData.get("note") || "").trim().slice(0, 200) || null;
    if (!["GIVEN", "HELD", "REFUSED"].includes(status)) throw new WardError("Choose given, held or refused.");
    if (status !== "GIVEN" && !note) throw new WardError("Say why the dose was held or refused.");

    const admission = await prisma.admission.findUnique({ where: { id: admissionId }, select: { id: true, status: true, encounterId: true } });
    if (!admission || admission.status !== "ADMITTED") throw new WardError("The patient isn't on the ward.");
    const rx = await prisma.prescription.findFirst({ where: { id: prescriptionId, encounterId: admission.encounterId, status: { not: "CANCELLED" } } });
    if (!rx) throw new WardError("That prescription isn't active for this admission.");

    await prisma.medicationAdministration.create({ data: { admissionId, prescriptionId, status, note, givenById: session.userId } });
    await audit({ action: `inpatient.med_${status.toLowerCase()}`, entity: "Admission", entityId: admissionId, userId: session.userId, details: { prescriptionId } });
    refresh(admission);
    return { success: status === "GIVEN" ? "Dose recorded." : `Recorded as ${status.toLowerCase()}.` };
  } catch (e) {
    if (e instanceof WardError) return { error: e.message };
    throw e;
  }
}

export async function dischargePatient(admissionId, prevState, formData) {
  try {
    const session = await requirePerm("clinical.write", "Only a doctor can discharge a patient.");
    const dischargeDiagnosis = String(formData.get("dischargeDiagnosis") || "").trim().slice(0, 200);
    const dischargeSummary = String(formData.get("dischargeSummary") || "").trim().slice(0, 3000);
    const followUp = String(formData.get("followUp") || "").trim().slice(0, 300) || null;
    if (dischargeDiagnosis.length < 3) throw new WardError("Enter the discharge diagnosis.");
    if (dischargeSummary.length < 10) throw new WardError("Write a discharge summary (what happened, treatment given, condition on discharge).");

    const admission = await prisma.admission.findUnique({ where: { id: admissionId }, include: { occupiedBed: { select: { id: true } } } });
    if (!admission || admission.status !== "ADMITTED") throw new WardError("Only a patient on the ward can be discharged.");

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      const done = await tx.admission.updateMany({
        where: { id: admissionId, status: "ADMITTED" },
        data: { status: "DISCHARGED", dischargedAt: now, dischargedById: session.userId, dischargeDiagnosis, dischargeSummary, followUp },
      });
      if (done.count === 0) throw new WardError("Someone else just discharged this patient.");
      if (admission.occupiedBed) await tx.bed.update({ where: { id: admission.occupiedBed.id }, data: { currentAdmissionId: null } });
      await tx.bedStay.updateMany({ where: { admissionId, to: null }, data: { to: now } });
    });

    await syncEncounterBill(admission.encounterId); // final bed nights
    await audit({ action: "inpatient.discharged", entity: "Admission", entityId: admissionId, userId: session.userId });
    refresh(admission);
    return { success: "Discharged. The bed is free and the bill is final for bed charges." };
  } catch (e) {
    if (e instanceof WardError) return { error: e.message };
    throw e;
  }
}
