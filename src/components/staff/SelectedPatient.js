import Link from "next/link";
import { fullName } from "@/lib/patients";

export default function SelectedPatient({ patient, changeHref }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
      <div>
        <p className="text-xs text-white/45">Patient</p>
        <p className="font-semibold">{fullName(patient)}</p>
        <p className="font-mono text-xs text-white/55">{patient.hospitalNumber}</p>
      </div>
      <Link href={changeHref} className="text-sm text-white/60 underline hover:text-white">
        Change patient
      </Link>
    </div>
  );
}
