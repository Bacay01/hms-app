import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatSex, fullName } from "@/lib/patients";
import { SITE } from "@/lib/site";
import PrintButton from "./PrintButton";

export default function PatientCardPage({ params }) {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading…</p>}>
      <PatientCard params={params} />
    </Suspense>
  );
}

async function PatientCard({ params }) {
  await requirePermission("patients.read");
  const { id } = await params;

  const patient = await prisma.patient.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      hospitalNumber: true,
      firstName: true,
      lastName: true,
      otherNames: true,
      dateOfBirth: true,
      sex: true,
      bloodGroup: true,
      genotype: true,
    },
  });
  if (!patient) notFound();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <Link href={`/patients/${patient.id}`} className="text-sm text-white/60 hover:text-white">
            ← {fullName(patient)}
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Patient card</h1>
          <p className="mt-1 text-sm text-white/60">Prints at bank-card size (85.6 × 54 mm).</p>
        </div>
        <PrintButton />
      </div>

      <div
        className="patient-card relative overflow-hidden rounded-2xl bg-white p-5 text-black shadow-2xl print:rounded-xl print:shadow-none"
        style={{ width: "85.6mm", height: "54mm" }}
      >
        <div className="flex items-start justify-between">
          <p className="text-sm font-bold tracking-tight">{SITE.name}</p>
          <span className="rounded-full bg-accent px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-white">
            Patient card
          </span>
        </div>

        <p className="mt-3 text-base font-bold leading-tight">{fullName(patient)}</p>
        <p className="mt-0.5 font-mono text-sm font-semibold tracking-wider text-accent">{patient.hospitalNumber}</p>

        <div className="mt-2 grid grid-cols-3 gap-2 text-[9px]">
          <div>
            <p className="text-neutral-500">Date of birth</p>
            <p className="font-semibold">{formatDate(patient.dateOfBirth)}</p>
          </div>
          <div>
            <p className="text-neutral-500">Sex</p>
            <p className="font-semibold">{formatSex(patient.sex)}</p>
          </div>
          <div>
            <p className="text-neutral-500">Blood / Genotype</p>
            <p className="font-semibold">
              {patient.bloodGroup ?? "—"} / {patient.genotype ?? "—"}
            </p>
          </div>
        </div>

        <p className="absolute inset-x-5 bottom-3 text-[7.5px] leading-tight text-neutral-500">
          Bring this card on every visit. If found, please return to {SITE.name}.
        </p>
      </div>
    </div>
  );
}
