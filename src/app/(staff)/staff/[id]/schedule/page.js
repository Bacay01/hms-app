import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dayRange, localDate } from "@/lib/time";
import ScheduleEditor from "./ScheduleEditor";

export default function DoctorSchedulePage({ params }) {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading…</p>}>
      <DoctorSchedule params={params} />
    </Suspense>
  );
}

async function DoctorSchedule({ params }) {
  await requirePermission("staff.manage");
  const { id } = await params;

  const doctor = await prisma.user.findFirst({
    where: { id, role: { name: "DOCTOR" } },
    include: { schedules: { select: { dayOfWeek: true, startTime: true, endTime: true } } },
  });
  if (!doctor) notFound();

  const today = localDate();
  const [departments, leaves] = await Promise.all([
    prisma.department.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.doctorLeave.findMany({ where: { doctorId: id, endDate: { gte: today } }, orderBy: { startDate: "asc" } }),
  ]);

  // How many booked appointments fall inside each leave
  const leavesWithBookings = await Promise.all(
    leaves.map(async (l) => ({
      id: l.id,
      startDate: l.startDate,
      endDate: l.endDate,
      reason: l.reason,
      booked: await prisma.appointment.count({
        where: {
          doctorId: id,
          status: "BOOKED",
          scheduledAt: { gte: dayRange(l.startDate).start, lt: dayRange(l.endDate).end },
        },
      }),
    }))
  );

  return (
    <div className="max-w-4xl">
      <Link href="/staff" className="text-sm text-white/60 hover:text-white">← Staff</Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">
        Dr {doctor.firstName} {doctor.lastName}
      </h1>
      <p className="mt-1 text-sm text-white/60">Schedule, room and leave</p>

      <ScheduleEditor
        doctor={{
          id: doctor.id,
          departmentId: doctor.departmentId,
          consultingRoom: doctor.consultingRoom,
          schedules: doctor.schedules,
        }}
        departments={departments}
        leaves={leavesWithBookings}
        today={today}
      />
    </div>
  );
}
