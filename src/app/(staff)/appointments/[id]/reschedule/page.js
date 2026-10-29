import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fullName } from "@/lib/patients";
import { localDate, localTime } from "@/lib/time";
import { rescheduleAppointment } from "../../manage-actions";
import RescheduleForm from "./RescheduleForm";

export default function ReschedulePage({ params }) {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading…</p>}>
      <Reschedule params={params} />
    </Suspense>
  );
}

async function Reschedule({ params }) {
  await requirePermission("appointments.manage");
  const { id } = await params;

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      patient: { select: { firstName: true, lastName: true, otherNames: true, hospitalNumber: true } },
      doctor: { select: { lastName: true } },
    },
  });
  if (!appointment) notFound();

  const backHref = `/appointments?date=${localDate(appointment.scheduledAt)}`;

  if (appointment.status !== "BOOKED") {
    return (
      <div className="max-w-3xl">
        <Link href={backHref} className="text-sm text-white/60 hover:text-white">← Appointments</Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Reschedule appointment</h1>
        <p className="mt-4 text-sm text-white/70">Only booked appointments can be rescheduled.</p>
      </div>
    );
  }

  const doctors = await prisma.user.findMany({
    where: { isActive: true, role: { name: "DOCTOR" } },
    orderBy: { firstName: "asc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      department: { select: { name: true } },
      schedules: { select: { dayOfWeek: true, startTime: true, endTime: true }, orderBy: { dayOfWeek: "asc" } },
    },
  });

  const now = new Date();
  const current = `${localDate(appointment.scheduledAt)}T${localTime(appointment.scheduledAt)}`;

  return (
    <div className="max-w-3xl">
      <Link href={backHref} className="text-sm text-white/60 hover:text-white">← Appointments</Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Reschedule appointment</h1>
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm">
        <p className="font-semibold">{fullName(appointment.patient)}</p>
        <p className="font-mono text-xs text-white/55">{appointment.patient.hospitalNumber}</p>
        <p className="mt-2 text-white/70">
          Currently with Dr {appointment.doctor.lastName} on {localDate(appointment.scheduledAt)} at{" "}
          {localTime(appointment.scheduledAt)}
        </p>
      </div>
      <RescheduleForm
        action={rescheduleAppointment.bind(null, appointment.id)}
        doctors={doctors}
        defaultDoctorId={appointment.doctorId}
        defaultDateTime={current}
        minDateTime={`${localDate(now)}T${localTime(now)}`}
        cancelHref={backHref}
      />
    </div>
  );
}
