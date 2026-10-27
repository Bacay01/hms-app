import { Suspense } from "react";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import PatientForm from "../PatientForm";
import { createPatient } from "../actions";

export default function NewPatientPage() {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading…</p>}>
      <NewPatient />
    </Suspense>
  );
}

async function NewPatient() {
  await requirePermission("patients.create");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-5xl">
      <Link href="/patients" className="text-sm text-white/60 hover:text-white">← Patients</Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Register patient</h1>
      <p className="mt-1 text-sm text-white/60">A hospital number is generated automatically.</p>
      <div className="mt-6">
        <PatientForm action={createPatient} submitLabel="Register patient" cancelHref="/patients" today={today} />
      </div>
    </div>
  );
}
