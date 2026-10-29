import { Suspense } from "react";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { doctorsForToday } from "@/lib/doctors";
import EmergencyForm from "./EmergencyForm";

export default function EmergencyPage() {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading…</p>}>
      <Emergency />
    </Suspense>
  );
}

async function Emergency() {
  await requirePermission("encounters.create");
  const doctors = await doctorsForToday();

  return (
    <div className="max-w-3xl">
      <Link href="/appointments" className="text-sm text-white/60 hover:text-white">← Appointments</Link>
      <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-accent">Emergency</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Emergency check-in</h1>
      <p className="mt-1 text-sm text-white/60">
        For patients who can&apos;t be registered right now. A temporary record is created and the patient goes to
        the top of the queue. Complete their details once they&apos;re stable.
      </p>
      <p className="mt-2 text-sm text-white/60">
        Already registered?{" "}
        <Link href="/appointments/check-in" className="font-medium text-white underline">
          Use walk-in check-in
        </Link>{" "}
        and set priority to Emergency.
      </p>
      <EmergencyForm doctors={doctors} />
    </div>
  );
}
