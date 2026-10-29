import { prisma } from "@/lib/prisma";

// Everyone on leave on a given day, as a Set → O(1) "is this doctor on leave?" checks
export async function doctorIdsOnLeave(dateStr) {
  const rows = await prisma.doctorLeave.findMany({
    where: { startDate: { lte: dateStr }, endDate: { gte: dateStr } },
    select: { doctorId: true },
  });
  return new Set(rows.map((r) => r.doctorId));
}

// The leave covering this doctor on this day, or null
export function leaveOn(doctorId, dateStr) {
  return prisma.doctorLeave.findFirst({
    where: { doctorId, startDate: { lte: dateStr }, endDate: { gte: dateStr } },
  });
}
