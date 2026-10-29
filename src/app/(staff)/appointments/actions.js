"use server";

   import { TriageQueue } from "@/lib/dsa/TriageQueue";
   import { getUndoableAction } from "@/lib/undo";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { nextHospitalNumber, nextQueueNumber } from "@/lib/numbers";
import { SEX_OPTIONS } from "@/lib/patients";
import {
  ACTIVE_STATUSES,
  PRIORITIES,
  REASSIGN_PERMISSIONS,
  TRANSITIONS,
  TRIAGE_PERMISSIONS,
  VISIT_TYPES,
  canAny,
} from "@/lib/queue";
import {
  DAY_NAMES,
  SLOT_MINUTES,
  dayRange,
  localDate,
  localDayOfWeek,
  localTime,
  parseLocalDateTime,
} from "@/lib/time";

const isPriority = (v) => PRIORITIES.some((p) => p.value === v);
const isVisitType = (v) => VISIT_TYPES.some((t) => t.value === v);

function findDoctor(id) {
  return prisma.user.findFirst({
    where: { id, isActive: true, role: { name: "DOCTOR" } },
    include: { schedules: true },
  });
}

function alreadyQueuedToday(patientId) {
  const { start, end } = dayRange(localDate());
  return prisma.encounter.findFirst({
    where: { patientId, status: { in: ACTIVE_STATUSES }, startedAt: { gte: start, lt: end } },
    select: { queueNumber: true },
  });
}

function refresh(patientId) {
  revalidatePath("/appointments");
  if (patientId) revalidatePath(`/patients/${patientId}`);
}

// ─────────────────────────────
// Appointments
// ─────────────────────────────

export async function bookAppointment(prevState, formData) {
  const session = await requirePermission("appointments.manage");

  const patientId = String(formData.get("patientId") || "");
  const doctorId = String(formData.get("doctorId") || "");
  const reason = String(formData.get("reason") || "").trim() || null;
  const visitType = String(formData.get("visitType") || "NEW");
  const scheduledAt = parseLocalDateTime(String(formData.get("scheduledAt") || ""));

  if (!scheduledAt) return { error: "Choose a date and time." };
  if (scheduledAt.getTime() < Date.now() - 5 * 60 * 1000) return { error: "That time has already passed." };
  if (!isVisitType(visitType)) return { error: "Choose a visit type." };

  const [patient, doctor] = await Promise.all([
    prisma.patient.findFirst({ where: { id: patientId, deletedAt: null }, select: { id: true } }),
    findDoctor(doctorId),
  ]);
  if (!patient) return { error: "Patient not found." };
  if (!doctor) return { error: "Choose a doctor." };

  // Leave, working hours and clashes (binary search) — shared with rescheduling
  const slot = await validateSlot({ doctor, scheduledAt });
  if (slot.error) return { error: slot.error };

  const appointment = await prisma.appointment.create({
    data: {
      patientId,
      doctorId,
      departmentId: doctor.departmentId,
      scheduledAt,
      reason,
      visitType,
      createdById: session.userId,
    },
  });

  await audit({
    action: "appointment.create",
    entity: "Appointment",
    entityId: appointment.id,
    userId: session.userId,
    details: { patientId, doctorId, visitType, scheduledAt: scheduledAt.toISOString() },
  });

  refresh(patientId);
  redirect(`/appointments?date=${localDate(scheduledAt)}`);
}

export async function cancelAppointment(prevState, formData) {
  const session = await requirePermission("appointments.manage");
  const id = String(formData.get("appointmentId") || "");

  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment || appointment.status !== "BOOKED") {
    return { error: "Only booked appointments can be cancelled." };
  }

  await prisma.appointment.update({ where: { id }, data: { status: "CANCELLED" } });
  await audit({ action: "appointment.cancel", entity: "Appointment", entityId: id, userId: session.userId });

  refresh(appointment.patientId);
  return {};
}

// ─────────────────────────────
// Check-in
// ─────────────────────────────

export async function checkIn(prevState, formData) {
  const session = await requirePermission("encounters.create");

  const appointmentId = String(formData.get("appointmentId") || "") || null;
  let patientId = String(formData.get("patientId") || "");
  let doctorId = String(formData.get("doctorId") || "");
  let reason = String(formData.get("reason") || "").trim() || null;
  let visitType = String(formData.get("visitType") || "NEW");
  const priority = String(formData.get("priority") || "NORMAL");
  let appointment = null;

  if (!isPriority(priority)) return { error: "Choose a priority." };

  if (appointmentId) {
    appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment || appointment.status !== "BOOKED") return { error: "This appointment can't be checked in." };
    if (localDate(appointment.scheduledAt) !== localDate()) return { error: "Only today's appointments can be checked in." };
    patientId = appointment.patientId;
    doctorId = appointment.doctorId;
    reason = appointment.reason;
    visitType = appointment.visitType;
  }

  if (!isVisitType(visitType)) return { error: "Choose a visit type." };

  const [patient, doctor] = await Promise.all([
    prisma.patient.findFirst({ where: { id: patientId, deletedAt: null }, select: { id: true } }),
    findDoctor(doctorId),
  ]);
  if (!patient) return { error: "Patient not found." };
  if (!doctor) return { error: "Choose a doctor." };

  const queued = await alreadyQueuedToday(patientId);
  if (queued) return { error: `This patient is already in today's queue (number ${queued.queueNumber}).` };

  const encounter = await prisma.$transaction(async (tx) => {
    const queueNumber = await nextQueueNumber(tx, doctor.id);
    const created = await tx.encounter.create({
      data: {
        patientId,
        doctorId: doctor.id,
        departmentId: doctor.departmentId,
        createdById: session.userId,
        reason,
        visitType,
        priority,
        priorityReason: priority === "NORMAL" ? null : "Set at check-in",
        queueNumber,
      },
    });
    if (appointment) {
      await tx.appointment.update({
        where: { id: appointment.id },
        data: { status: "CHECKED_IN", encounterId: created.id },
      });
    }
    return created;
  });

  await audit({
    action: "encounter.check_in",
    entity: "Encounter",
    entityId: encounter.id,
    userId: session.userId,
    details: { queueNumber: encounter.queueNumber, priority, visitType, appointmentId },
  });

  refresh(patientId);
  if (appointmentId) return { success: `Checked in — queue number ${encounter.queueNumber}.` };
  redirect("/appointments");
}

// Unidentified or unregistered emergency: temporary record + top of the queue
export async function emergencyCheckIn(prevState, formData) {
  const session = await requirePermission("encounters.create");
  const get = (key) => String(formData.get(key) ?? "").trim();

  const sex = get("sex");
  const ageText = get("approxAge");
  const age = Number(ageText);
  const complaint = get("complaint");
  const doctorId = get("doctorId");

  if (!SEX_OPTIONS.some((s) => s.value === sex)) return { error: "Select the patient's sex." };
  if (!ageText || !Number.isInteger(age) || age < 0 || age > 120) {
    return { error: "Enter an estimated age between 0 and 120." };
  }
  if (!complaint) return { error: "Enter the presenting complaint." };

  const doctor = await findDoctor(doctorId);
  if (!doctor) return { error: "Choose a doctor." };

  const firstName = get("firstName") || "Unknown";
  const lastName = get("lastName") || (sex === "MALE" ? "Male" : "Female");
  const birthYear = Number(localDate().slice(0, 4)) - age;
  const dateOfBirth = new Date(`${String(birthYear).padStart(4, "0")}-07-01T00:00:00.000Z`);

  const { patient, encounter } = await prisma.$transaction(async (tx) => {
    const hospitalNumber = await nextHospitalNumber(tx);
    const patient = await tx.patient.create({
      data: {
        hospitalNumber,
        firstName,
        lastName,
        dateOfBirth,
        dobEstimated: true,
        sex,
        phone: get("phone"),
        isProvisional: true,
        registeredById: session.userId,
      },
    });
    const queueNumber = await nextQueueNumber(tx, doctor.id);
    const encounter = await tx.encounter.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        departmentId: doctor.departmentId,
        createdById: session.userId,
        type: "EMERGENCY",
        priority: "EMERGENCY",
        priorityReason: "Emergency check-in",
        visitType: "NEW",
        reason: complaint,
        queueNumber,
      },
    });
    return { patient, encounter };
  });

  await audit({
    action: "patient.create_emergency",
    entity: "Patient",
    entityId: patient.id,
    userId: session.userId,
    details: { hospitalNumber: patient.hospitalNumber },
  });
  await audit({
    action: "encounter.check_in",
    entity: "Encounter",
    entityId: encounter.id,
    userId: session.userId,
    details: { queueNumber: encounter.queueNumber, priority: "EMERGENCY", emergency: true },
  });

  refresh(patient.id);
  redirect("/appointments");
}

// ─────────────────────────────
// Queue
// ─────────────────────────────

export async function moveEncounter(prevState, formData) {
  const session = await requireSession();
  const encounterId = String(formData.get("encounterId") || "");
  const to = String(formData.get("to") || "");

  const encounter = await prisma.encounter.findUnique({
    where: { id: encounterId },
    include: { appointment: { select: { id: true } } },
  });
  if (!encounter) return { error: "Visit not found." };

  const transition = (TRANSITIONS[encounter.status] ?? []).find((t) => t.to === to);
  if (!transition) return { error: "That move isn't allowed from the current status." };
  if (!canAny(session.permissions, transition.permissions)) return { error: "Your role can't do that." };

  const now = new Date();
  const stamps =
    to === "WITH_NURSE"
      ? { nurseAt: now }
      : to === "WITH_DOCTOR"
        ? { doctorAt: now }
        : { endedAt: now }; // COMPLETED, LEFT, CANCELLED

  // Only update if nobody else moved this patient in the meantime
  const updated = await prisma.encounter.updateMany({
    where: { id: encounter.id, status: encounter.status },
    data: { status: to, ...stamps },
  });
  if (updated.count === 0) return { error: "Someone else just updated this patient. Refreshing…" };

  if (to === "COMPLETED" && encounter.appointment) {
    await prisma.appointment.update({ where: { id: encounter.appointment.id }, data: { status: "COMPLETED" } });
  }

  await audit({
    action: "encounter.status",
    entity: "Encounter",
    entityId: encounter.id,
    userId: session.userId,
    details: { from: encounter.status, to },
  });

  refresh(encounter.patientId);
  return {};
}

export async function callNext(prevState, formData) {
  const session = await requireSession();
  if (!canAny(session.permissions, ["vitals.write"])) return { error: "Your role can't call patients." };

  const doctorId = String(formData.get("doctorId") || "");
  const { start, end } = dayRange(localDate());

  // TriageQueue (MinHeap) decides who is next: Emergency → Urgent → Normal, then by number
  const waiting = await prisma.encounter.findMany({
    where: { doctorId, status: "WAITING", startedAt: { gte: start, lt: end } },
    select: { id: true, patientId: true, priority: true, queueNumber: true },
  });
  const next = new TriageQueue(waiting).peek();
  if (!next) return { error: "No one is waiting." };

  // If two nurses click at once, only one of them gets this patient
  const updated = await prisma.encounter.updateMany({
    where: { id: next.id, status: "WAITING" },
    data: { status: "WITH_NURSE", nurseAt: new Date() },
  });
  if (updated.count === 0) return { error: "That patient was just called by someone else. Try again." };

  await audit({
    action: "encounter.status",
    entity: "Encounter",
    entityId: next.id,
    userId: session.userId,
    details: { from: "WAITING", to: "WITH_NURSE", via: "call_next" },
  });

  refresh(next.patientId);
  return { called: next.queueNumber };
}

export async function setPriority(prevState, formData) {
  const session = await requireSession();
  if (!canAny(session.permissions, TRIAGE_PERMISSIONS)) return { error: "Only nurses and doctors can change priority." };

  const encounterId = String(formData.get("encounterId") || "");
  const priority = String(formData.get("priority") || "");
  const reason = String(formData.get("reason") || "").trim() || null;
  if (!isPriority(priority)) return { error: "Choose a priority." };

  const encounter = await prisma.encounter.findUnique({ where: { id: encounterId } });
  if (!encounter || !ACTIVE_STATUSES.includes(encounter.status)) return { error: "This patient is no longer in the queue." };
  if (encounter.priority === priority) return {};

  await prisma.encounter.update({
    where: { id: encounter.id },
    data: { priority, priorityReason: reason },
  });

  await audit({
    action: "encounter.priority",
    entity: "Encounter",
    entityId: encounter.id,
    userId: session.userId,
    details: { from: encounter.priority, to: priority, reason },
  });

  refresh(encounter.patientId);
  return {};
}

export async function reassignEncounter(prevState, formData) {
  const session = await requireSession();
  if (!canAny(session.permissions, REASSIGN_PERMISSIONS)) return { error: "Your role can't reassign patients." };

  const encounterId = String(formData.get("encounterId") || "");
  const doctorId = String(formData.get("doctorId") || "");

  const [encounter, doctor] = await Promise.all([
    prisma.encounter.findUnique({ where: { id: encounterId } }),
    findDoctor(doctorId),
  ]);
  if (!encounter || !["WAITING", "WITH_NURSE"].includes(encounter.status)) {
    return { error: "Only patients waiting or with the nurse can be reassigned." };
  }
  if (!doctor) return { error: "Choose a doctor." };
  if (doctor.id === encounter.doctorId) return {};

  const queueNumber = await prisma.$transaction(async (tx) => {
    const number = await nextQueueNumber(tx, doctor.id);
    await tx.encounter.update({
      where: { id: encounter.id },
      data: { doctorId: doctor.id, departmentId: doctor.departmentId, queueNumber: number },
    });
    return number;
  });

  await audit({
    action: "encounter.reassign",
    entity: "Encounter",
    entityId: encounter.id,
    userId: session.userId,
    details: { fromDoctorId: encounter.doctorId, toDoctorId: doctor.id, newQueueNumber: queueNumber },
  });

  refresh(encounter.patientId);
  return {};
}

// Undo the current user's last queue move (Stack replayed from the audit log)
export async function undoLastAction(prevState, formData) {
  const session = await requireSession();

  const undoable = await getUndoableAction(session.userId);
  if (!undoable) return { error: "Nothing to undo. Actions can be undone for 5 minutes." };

  // Clear the timestamp the original move set
  const clear =
    undoable.to === "WITH_NURSE"
      ? { nurseAt: null }
      : undoable.to === "WITH_DOCTOR"
        ? { doctorAt: null }
        : { endedAt: null };

  // Only if the patient is still where this user left them
  const updated = await prisma.encounter.updateMany({
    where: { id: undoable.encounterId, status: undoable.to },
    data: { status: undoable.from, ...clear },
  });
  if (updated.count === 0) return { error: "Someone else has updated this patient since, so it can't be undone." };

  if (undoable.to === "COMPLETED") {
    await prisma.appointment.updateMany({
      where: { encounterId: undoable.encounterId, status: "COMPLETED" },
      data: { status: "CHECKED_IN" },
    });
  }

  await audit({
    action: "encounter.status_undo",
    entity: "Encounter",
    entityId: undoable.encounterId,
    userId: session.userId,
    details: { undoOf: undoable.auditId, from: undoable.to, to: undoable.from },
  });

  refresh();
  return {};
}
