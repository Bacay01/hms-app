"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { DAY_NAMES, dayRange, localDate } from "@/lib/time";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function getDoctor(id) {
  return prisma.user.findFirst({
    where: { id, role: { name: "DOCTOR" } },
    select: { id: true, lastName: true },
  });
}

function refresh(doctorId) {
  revalidatePath(`/staff/${doctorId}/schedule`);
  revalidatePath("/appointments");
  revalidatePath("/display");
}

export async function updateDoctorProfile(doctorId, prevState, formData) {
  const session = await requirePermission("staff.manage");
  const doctor = await getDoctor(doctorId);
  if (!doctor) return { error: "Doctor not found." };

  const departmentId = String(formData.get("departmentId") || "") || null;
  const consultingRoom = String(formData.get("consultingRoom") || "").trim().slice(0, 30) || null;

  if (departmentId) {
    const dept = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!dept) return { error: "Choose a valid department." };
  }

  await prisma.user.update({ where: { id: doctorId }, data: { departmentId, consultingRoom } });
  await audit({
    action: "staff.doctor_profile",
    entity: "User",
    entityId: doctorId,
    userId: session.userId,
    details: { departmentId, consultingRoom },
  });

  refresh(doctorId);
  return { success: "Department and room saved." };
}

export async function updateWeeklySchedule(doctorId, prevState, formData) {
  const session = await requirePermission("staff.manage");
  const doctor = await getDoctor(doctorId);
  if (!doctor) return { error: "Doctor not found." };

  const days = [];
  for (let d = 0; d < 7; d++) {
    if (formData.get(`day-${d}-on`) !== "on") continue;
    const startTime = String(formData.get(`day-${d}-start`) || "");
    const endTime = String(formData.get(`day-${d}-end`) || "");
    if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
      return { error: `Enter valid times for ${DAY_NAMES[d]}.` };
    }
    if (startTime >= endTime) return { error: `${DAY_NAMES[d]}: start time must be before end time.` };
    days.push({ doctorId, dayOfWeek: d, startTime, endTime });
  }

  await prisma.$transaction([
    prisma.doctorSchedule.deleteMany({ where: { doctorId } }),
    prisma.doctorSchedule.createMany({ data: days }),
  ]);

  await audit({
    action: "staff.schedule_update",
    entity: "User",
    entityId: doctorId,
    userId: session.userId,
    details: { days: days.map((x) => `${DAY_NAMES[x.dayOfWeek].slice(0, 3)} ${x.startTime}-${x.endTime}`) },
  });

  refresh(doctorId);
  return {
    success: days.length ? `Schedule saved: ${days.length} working day(s).` : "Schedule cleared — no working days set.",
  };
}

export async function addLeave(doctorId, prevState, formData) {
  const session = await requirePermission("staff.manage");
  const doctor = await getDoctor(doctorId);
  if (!doctor) return { error: "Doctor not found." };

  const startDate = String(formData.get("startDate") || "");
  const endDate = String(formData.get("endDate") || "");
  const reason = String(formData.get("reason") || "").trim().slice(0, 100) || null;

  if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) return { error: "Choose start and end dates." };
  if (endDate < startDate) return { error: "The end date can't be before the start date." };
  if (endDate < localDate()) return { error: "That leave is entirely in the past." };

  // Interval overlap: [a, b] and [c, d] overlap when a <= d and c <= b
  const overlap = await prisma.doctorLeave.findFirst({
    where: { doctorId, startDate: { lte: endDate }, endDate: { gte: startDate } },
  });
  if (overlap) {
    return { error: `This overlaps existing leave (${overlap.startDate} to ${overlap.endDate}).` };
  }

  const leave = await prisma.doctorLeave.create({
    data: { doctorId, startDate, endDate, reason, createdById: session.userId },
  });

  const booked = await prisma.appointment.count({
    where: {
      doctorId,
      status: "BOOKED",
      scheduledAt: { gte: dayRange(startDate).start, lt: dayRange(endDate).end },
    },
  });

  await audit({
    action: "staff.leave_add",
    entity: "User",
    entityId: doctorId,
    userId: session.userId,
    details: { leaveId: leave.id, startDate, endDate, bookedAppointments: booked },
  });

  refresh(doctorId);
  return {
    success:
      `Leave added for Dr ${doctor.lastName}.` +
      (booked ? ` ${booked} booked appointment(s) fall in this period — please reschedule them.` : ""),
  };
}

export async function removeLeave(prevState, formData) {
  const session = await requirePermission("staff.manage");
  const leaveId = String(formData.get("leaveId") || "");

  const leave = await prisma.doctorLeave.findUnique({ where: { id: leaveId } });
  if (!leave) return { error: "Leave not found." };

  await prisma.doctorLeave.delete({ where: { id: leaveId } });
  await audit({
    action: "staff.leave_remove",
    entity: "User",
    entityId: leave.doctorId,
    userId: session.userId,
    details: { startDate: leave.startDate, endDate: leave.endDate },
  });

  refresh(leave.doctorId);
  return {};
}
