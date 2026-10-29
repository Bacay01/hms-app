import { prisma } from "@/lib/prisma";
import { localDayOfWeek } from "@/lib/time";

// Active doctors, those on duty today listed first
export async function doctorsForToday() {
  const dow = localDayOfWeek();
  const all = await prisma.user.findMany({
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
  });

  return all
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
