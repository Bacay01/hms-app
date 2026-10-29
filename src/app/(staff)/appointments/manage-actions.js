"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { findDoctor, validateSlot } from "@/lib/scheduling";
import { ACTIVE_STATUSES } from "@/lib/queue";
import { dayRange, localDate, parseLocalDateTime } from "@/lib/time";

export async function rescheduleAppointment(appointmentId, prevState, formData) {
  const session = await requirePermission("appointments.manage");

  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment || appointment.status !== "BOOKED") {
    return { error: "Only booked appointments can be rescheduled." };
  }

  const scheduledAt = parseLocalDateTime(String(formData.get("scheduledAt") || ""));
  if (!scheduledAt) return { error: "Choose a date and time." };
  if (scheduledAt.getTime() < Date.now() - 5 * 60 * 1000) return { error: "That time has already passed." };

  const doctor = await findDoctor(String(formData.get("doctorId") || ""));
  if (!doctor) return { error: "Choose a doctor." };

  const slot = await validateSlot({ doctor, scheduledAt, excludeAppointmentId: appointment.id });
  if (slot.error) return { error: slot.error };

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { doctorId: doctor.id, departmentId: doctor.departmentId, scheduledAt },
  });

  await audit({
    action: "appointment.reschedule",
    entity: "Appointment",
    entityId: appointment.id,
    userId: session.userId,
    details: {
      fromTime: appointment.scheduledAt.toISOString(),
      toTime: scheduledAt.toISOString(),
      fromDoctorId: appointment.doctorId,
      toDoctorId: doctor.id,
    },
  });

  revalidatePath("/appointments");
  redirect(`/appointments?date=${localDate(scheduledAt)}`);
}

export async function markNoShow(prevState, formData) {
  const session = await requirePermission("appointments.manage");
  const id = String(formData.get("appointmentId") || "");

  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment || appointment.status !== "BOOKED") {
    return { error: "Only booked appointments can be marked as no-show." };
  }
  if (appointment.scheduledAt > new Date()) {
    return { error: "You can only mark a no-show after the appointment time." };
  }

  await prisma.appointment.update({ where: { id }, data: { status: "NO_SHOW" } });
  await audit({ action: "appointment.no_show", entity: "Appointment", entityId: id, userId: session.userId });

  revalidatePath("/appointments");
  return {};
}

// Closing time: tidy the queue so tomorrow starts clean
export async function closeDay() {
  const session = await requirePermission("appointments.manage");
  const { start: todayStart } = dayRange(localDate());
  const now = new Date();

  const [earlierDays, waitingToday, noShows] = await prisma.$transaction([
    // Anything still open from previous days
    prisma.encounter.updateMany({
      where: { status: { in: ACTIVE_STATUSES }, startedAt: { lt: todayStart } },
      data: { status: "LEFT", endedAt: now },
    }),
    // Today's patients still waiting (those with a nurse or doctor are left alone)
    prisma.encounter.updateMany({
      where: { status: "WAITING", startedAt: { gte: todayStart } },
      data: { status: "LEFT", endedAt: now },
    }),
    // Booked appointments whose time has passed
    prisma.appointment.updateMany({
      where: { status: "BOOKED", scheduledAt: { lt: now } },
      data: { status: "NO_SHOW" },
    }),
  ]);

  await audit({
    action: "queue.close_day",
    entity: "Queue",
    userId: session.userId,
    details: { waitingMarkedLeft: waitingToday.count, earlierDaysClosed: earlierDays.count, noShows: noShows.count },
  });

  revalidatePath("/appointments");

  const parts = [
    `${waitingToday.count} waiting patient(s) marked as left`,
    `${noShows.count} missed appointment(s) marked as no-show`,
  ];
  if (earlierDays.count) parts.push(`${earlierDays.count} visit(s) from earlier days closed`);
  return { success: `Day closed: ${parts.join(", ")}.` };
}
