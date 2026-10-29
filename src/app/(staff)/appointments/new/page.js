import { Suspense } from "react";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { localDate, localTime } from "@/lib/time";
import PatientPicker from "@/components/staff/PatientPicker";
import SelectedPatient from "@/components/staff/SelectedPatient";
import BookingForm from "./BookingForm";

export default function NewAppointmentPage({ searchParams }) {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading…</p>}>
      <NewAppointment searchParams={searchParams} />
    </Suspense>
  );
}

async function NewAppointment({ searchParams }) {
  await requirePermission("appointments.manage");
  const { patientId = "", q = "" } = await searchParams;

  const patient = patientId
    ? await prisma.patient.findFirst({
        where: { id: patientId, deletedAt: null },
        select: { id: true, hospitalNumber: true, firstName: true, lastName: true, otherNames: true },
      })
    : null;

  let doctors = [];
  let defaultVisitType = "NEW";
  if (patient) {
    const [list, seenBefore] = await Promise.all([
      prisma.user.findMany({
        where: { isActive: true, role: { name: "DOCTOR" } },
        orderBy: { firstName: "asc" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          consultingRoom: true,
          department: { select: { name: true } },
          schedules: { select: { dayOfWeek: true, startTime: true, endTime: true }, orderBy: { dayOfWeek: "asc" } },
        },
      }),
      prisma.encounter.count({ where: { patientId: patient.id, status: "COMPLETED" } }),
    ]);
    doctors = list;
    defaultVisitType = seenBefore > 0 ? "FOLLOW_UP" : "NEW";
  }

  const now = new Date();
  const minDateTime = `${localDate(now)}T${localTime(now)}`;

  return (
    <div className="max-w-3xl">
      <Link href="/appointments" className="text-sm text-white/60 hover:text-white">← Appointments</Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Book appointment</h1>

      {!patient ? (
        <>
          <p className="mt-1 text-sm text-white/60">Step 1 — find the patient.</p>
          <div className="mt-6">
            <PatientPicker q={q} basePath="/appointments/new" />
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-white/60">Step 2 — choose a doctor and time.</p>
          <div className="mt-6">
            <SelectedPatient patient={patient} changeHref="/appointments/new" />
            <BookingForm
              patientId={patient.id}
              doctors={doctors}
              minDateTime={minDateTime}
              defaultVisitType={defaultVisitType}
            />
          </div>
        </>
      )}
    </div>
  );
}
