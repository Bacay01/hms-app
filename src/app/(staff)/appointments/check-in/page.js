import { Suspense } from "react";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { doctorsForToday } from "@/lib/doctors";
import PatientPicker from "@/components/staff/PatientPicker";
import SelectedPatient from "@/components/staff/SelectedPatient";
import CheckInForm from "./CheckInForm";

export default function CheckInPage({ searchParams }) {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading…</p>}>
      <CheckIn searchParams={searchParams} />
    </Suspense>
  );
}

async function CheckIn({ searchParams }) {
  await requirePermission("encounters.create");
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
      doctorsForToday(),
      prisma.encounter.count({ where: { patientId: patient.id, status: "COMPLETED" } }),
    ]);
    doctors = list;
    defaultVisitType = seenBefore > 0 ? "FOLLOW_UP" : "NEW";
  }

  return (
    <div className="max-w-3xl">
      <Link href="/appointments" className="text-sm text-white/60 hover:text-white">← Appointments</Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Walk-in check-in</h1>
      <p className="mt-1 text-sm text-white/60">
        Unidentified or unregistered emergency?{" "}
        <Link href="/appointments/emergency" className="font-medium text-white underline">
          Use emergency check-in
        </Link>
      </p>

      {!patient ? (
        <>
          <p className="mt-4 text-sm text-white/60">Step 1 — find the patient.</p>
          <div className="mt-4">
            <PatientPicker q={q} basePath="/appointments/check-in" />
          </div>
        </>
      ) : (
        <>
          <p className="mt-4 text-sm text-white/60">Step 2 — choose a doctor and priority.</p>
          <div className="mt-4">
            <SelectedPatient patient={patient} changeHref="/appointments/check-in" />
            <CheckInForm patientId={patient.id} doctors={doctors} defaultVisitType={defaultVisitType} />
          </div>
        </>
      )}
    </div>
  );
}
