import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bedChargeLines } from "@/lib/inpatient";
import { ageFrom, formatDateTime, formatSex, fullName } from "@/lib/patients";
import { plainInstructions } from "@/lib/prescribing";
import { SITE } from "@/lib/site";
import { localDate } from "@/lib/time";
import PrintPageButton from "@/components/staff/PrintPageButton";

export default function SummaryPage({ params }) {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading…</p>}>
      <Summary params={params} />
    </Suspense>
  );
}

async function Summary({ params }) {
  await requirePermission("clinical.read");
  const { id } = await params;

  const a = await prisma.admission.findUnique({
    where: { id },
    include: {
      patient: { select: { firstName: true, lastName: true, otherNames: true, hospitalNumber: true, sex: true, dateOfBirth: true, dobEstimated: true } },
      admittingDoctor: { select: { firstName: true, lastName: true } },
      dischargedBy: { select: { firstName: true, lastName: true } },
      bedStays: { orderBy: { from: "asc" } },
      encounter: {
        select: {
          diagnoses: { where: { removedAt: null }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }], select: { name: true, code: true } },
          prescriptions: { where: { status: { not: "CANCELLED" } }, orderBy: { createdAt: "asc" } },
          labRequests: { where: { status: "COMPLETED" }, orderBy: { createdAt: "asc" }, select: { testName: true, accessionNumber: true } },
        },
      },
    },
  });
  if (!a) notFound();
  if (a.status !== "DISCHARGED") {
    return (
      <div className="max-w-md">
        <Link href={`/inpatient/${a.id}`} className="text-sm text-white/60 hover:text-white">← Back</Link>
        <p className="mt-4 text-sm text-white/70">The discharge summary is available once the patient has been discharged.</p>
      </div>
    );
  }

  const nights = bedChargeLines(
    a.bedStays.map((s) => ({ id: s.id, wardName: s.wardName, rateKobo: s.rateKobo, fromDate: localDate(s.from), toDate: s.to ? localDate(s.to) : null })),
    localDate(a.dischargedAt)
  ).reduce((s, l) => s + l.nights, 0);
  const person = (u) => (u ? `Dr ${u.firstName} ${u.lastName}` : "—");

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/inpatient/${a.id}`} className="text-sm text-white/60 hover:text-white">← Back</Link>
        <PrintPageButton label="Print / Save as PDF" />
      </div>

      <article className="rounded-2xl bg-white p-8 text-sm text-neutral-900 print:rounded-none print:p-0">
        <div className="border-b border-neutral-200 pb-3">
          <p className="text-xl font-bold">{SITE.name}</p>
          <p className="text-xs text-neutral-500">Discharge summary</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1">
          <p><span className="text-neutral-500">Patient:</span> {fullName(a.patient)}</p>
          <p><span className="text-neutral-500">Hospital no.:</span> <span className="font-mono">{a.patient.hospitalNumber}</span></p>
          <p><span className="text-neutral-500">Sex / age:</span> {formatSex(a.patient.sex)} · {a.patient.dobEstimated ? "~" : ""}{ageFrom(a.patient.dateOfBirth)} y</p>
          <p><span className="text-neutral-500">Length of stay:</span> {nights} night{nights === 1 ? "" : "s"}</p>
          <p><span className="text-neutral-500">Admitted:</span> {formatDateTime(a.admittedAt)}</p>
          <p><span className="text-neutral-500">Discharged:</span> {formatDateTime(a.dischargedAt)}</p>
          <p className="col-span-2"><span className="text-neutral-500">Ward(s):</span> {[...new Set(a.bedStays.map((s) => s.wardName))].join(" → ")}</p>
        </div>

        <h2 className="mt-6 font-semibold">Diagnosis</h2>
        <p className="mt-1">{a.dischargeDiagnosis}</p>
        {a.encounter.diagnoses.length > 0 && (
          <p className="mt-1 text-xs text-neutral-600">
            Working diagnoses: {a.encounter.diagnoses.map((d) => `${d.name}${d.code ? ` (${d.code})` : ""}`).join("; ")}
          </p>
        )}

        <h2 className="mt-5 font-semibold">Summary</h2>
        <p className="mt-1 whitespace-pre-wrap">{a.dischargeSummary}</p>

        {a.encounter.prescriptions.length > 0 && (
          <>
            <h2 className="mt-5 font-semibold">Medications</h2>
            <ul className="mt-1 list-disc pl-5">
              {a.encounter.prescriptions.map((rx) => (
                <li key={rx.id}>
                  {rx.drugName} — {plainInstructions(rx)}
                </li>
              ))}
            </ul>
          </>
        )}

        {a.encounter.labRequests.length > 0 && (
          <p className="mt-5 text-xs text-neutral-600">
            Investigations (reports on file): {a.encounter.labRequests.map((l) => `${l.testName} ${l.accessionNumber ?? ""}`).join(" · ")}
          </p>
        )}

        {a.followUp && (
          <>
            <h2 className="mt-5 font-semibold">Follow-up</h2>
            <p className="mt-1">{a.followUp}</p>
          </>
        )}

        <div className="mt-8 grid grid-cols-2 gap-6 border-t border-neutral-200 pt-4 text-xs">
          <div>
            <p className="text-neutral-500">Admitting doctor</p>
            <p className="font-medium">{person(a.admittingDoctor)}</p>
          </div>
          <div>
            <p className="text-neutral-500">Discharging doctor</p>
            <p className="font-medium">{person(a.dischargedBy)}</p>
          </div>
        </div>
      </article>
    </div>
  );
}
