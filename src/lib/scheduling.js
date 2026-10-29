import { prisma } from "@/lib/prisma";
import { findOverlap, nextFreeSlot } from "@/lib/dsa/intervals";
import {
  DAY_NAMES,
  SLOT_MINUTES,
  TZ_OFFSET,
  dayRange,
  localDate,
  localDayOfWeek,
  localTime,
} from "@/lib/time";

const SLOT_MS = SLOT_MINUTES * 60 * 1000;

export function findDoctor(id) {
  return prisma.user.findFirst({
    where: { id, isActive: true, role: { name: "DOCTOR" } },
    include: { schedules: true },
  });
}

// Checks working hours, then clashes using binary search over the doctor's day.
// Returns { error } — error is null when the slot is free.
export async function validateSlot({ doctor, scheduledAt, excludeAppointmentId }) {
  const dateStr = localDate(scheduledAt);
  const { start: dayStart, end: dayEnd } = dayRange(dateStr);
  let latestStart = dayEnd.getTime() - SLOT_MS;

  if (doctor.schedules.length > 0) {
    const day = localDayOfWeek(scheduledAt);
    const time = localTime(scheduledAt);
    const shift = doctor.schedules.find((s) => s.dayOfWeek === day);
    if (!shift) return { error: `Dr ${doctor.lastName} doesn't work on ${DAY_NAMES[day]}s.` };
    if (time < shift.startTime || time >= shift.endTime) {
      return { error: `Dr ${doctor.lastName} works ${shift.startTime}–${shift.endTime} on ${DAY_NAMES[day]}s.` };
    }
    latestStart = new Date(`${dateStr}T${shift.endTime}:00${TZ_OFFSET}`).getTime() - 60 * 1000;
  }

  const sameDay = await prisma.appointment.findMany({
    where: {
      doctorId: doctor.id,
      status: { in: ["BOOKED", "CHECKED_IN"] },
      scheduledAt: { gte: dayStart, lt: dayEnd },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
    select: { scheduledAt: true },
  });

  const sorted = sameDay.map((a) => a.scheduledAt.getTime()).sort((a, b) => a - b);
  const clash = findOverlap(sorted, scheduledAt.getTime(), SLOT_MS);
  if (clash === null) return { error: null };

  const free = nextFreeSlot(sorted, scheduledAt.getTime(), SLOT_MS, latestStart);
  return {
    error:
      `Dr ${doctor.lastName} already has an appointment at ${localTime(clash)}. ` +
      (free !== null ? `Next free slot: ${localTime(free)}.` : "No free slots left that day."),
  };
}
