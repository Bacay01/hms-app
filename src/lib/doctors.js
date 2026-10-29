import { prisma } from "@/lib/prisma";
import { doctorIdsOnLeave } from "@/lib/leave";
import { localDate, localDayOfWeek } from "@/lib/time";

// Active doctors who are NOT on leave today, those on duty listed first
export async function doctorsForToday() {
  const dow = localDayOfWeek();
  const [all, onLeave] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true, role: { name: "DOCTOR" } },
      orderBy: { firstName: "asc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        consultingRoom: true,
        department: { select: { name: true } },
        schedules: { select: { dayOfWeek: true } },
      },
    }),
    doctorIdsOnLeave(localDate()),
  ]);

  return all
    .filter((d) => !onLeave.has(d.id))
    .map((d) => ({
      id: d.id,
      firstName: d.firstName,
      lastName: d.lastName,
      room: d.consultingRoom,
      department: d.department?.name ?? null,
      onDuty: d.schedules.some((s) => s.dayOfWeek === dow),
    }))
    .sort((a, b) => Number(b.onDuty) - Number(a.onDuty));
}
