"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { parsePatientForm, HOSPITAL_NUMBER_PREFIX } from "@/lib/patients";

export async function createPatient(prevState, formData) {
  const session = await requirePermission("patients.create");

  const { data, error } = parsePatientForm(formData);
  if (error) return { error };

  if (formData.get("consent") !== "on") {
    return { error: "The patient's consent is required before their records can be stored." };
  }

  const duplicate = await prisma.patient.findFirst({
    where: {
      deletedAt: null,
      firstName: { equals: data.firstName, mode: "insensitive" },
      lastName: { equals: data.lastName, mode: "insensitive" },
      phone: data.phone,
      dateOfBirth: data.dateOfBirth,
    },
    select: { id: true, hospitalNumber: true },
  });
  if (duplicate) {
    return {
      error: `This patient may already be registered as ${duplicate.hospitalNumber} (same name, phone and date of birth).`,
      duplicateId: duplicate.id,
    };
  }

  const year = new Date().getFullYear();
  const patient = await prisma.$transaction(async (tx) => {
    // Atomic increment — two receptionists can never get the same number
    const counter = await tx.counter.upsert({
      where: { key: `patient-${year}` },
      update: { value: { increment: 1 } },
      create: { key: `patient-${year}`, value: 1 },
    });
    const hospitalNumber = `${HOSPITAL_NUMBER_PREFIX}-${year}-${String(counter.value).padStart(6, "0")}`;

    return tx.patient.create({
      data: {
        ...data,
        hospitalNumber,
        consentGiven: true,
        consentAt: new Date(),
        registeredById: session.userId,
      },
    });
  });

  await audit({
    action: "patient.create",
    entity: "Patient",
    entityId: patient.id,
    userId: session.userId,
    details: { hospitalNumber: patient.hospitalNumber },
  });

  revalidatePath("/patients");
  redirect(`/patients/${patient.id}`);
}

export async function updatePatient(patientId, prevState, formData) {
  const session = await requirePermission("patients.update");

  const existing = await prisma.patient.findFirst({ where: { id: patientId, deletedAt: null } });
  if (!existing) return { error: "Patient not found." };

  const { data, error } = parsePatientForm(formData);
  if (error) return { error };

  const normalise = (v) => (v instanceof Date ? v.toISOString() : String(v ?? ""));
  const changed = Object.keys(data).filter((key) => normalise(existing[key]) !== normalise(data[key]));

  if (changed.length > 0) {
    await prisma.patient.update({ where: { id: patientId }, data });
    // Field names only — never the values (health data)
    await audit({
      action: "patient.update",
      entity: "Patient",
      entityId: patientId,
      userId: session.userId,
      details: { changed },
    });
  }

  revalidatePath("/patients");
  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}`);
}
