import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FLAG_LABELS } from "@/lib/labRanges";
import { FLAG_SHORT } from "@/lib/labWorklist";
import { ageFrom, formatDateTime, formatSex, fullName } from "@/lib/patients";
import { SITE } from "@/lib/site";
import PrintPageButton from "@/components/staff/PrintPageButton";

export default function LabReportPage({ params }) {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading report…</p>}>
      <LabReport params={params} />
    </Suspense>
  );
}

const person = (u) => (u ? `${u.firstName} ${u.lastName}` : "—");

async function LabReport({ params }) {
  await requirePermission("lab.requests.read");
  const { id } = await params;

  const lab = await prisma.labRequest.findUnique({
    where: { id },
    include: {
      patient: { select: { firstName: true, lastName: true, otherNames: true, hospitalNumber: true, sex: true, dateOfBirth: true, dobEstimated: true } },
      requestedBy: { select: { firstName: true, lastName: true } },
      resultedBy: { select: { firstName: true, lastName: true } },
      verifiedBy: { select: { firstName: true, lastName: true } },
      results: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!lab) notFound();

  if (lab.status !== "COMPLETED") {
    return (
      <div className="max-w-md">
        <Link href={`/lab/${lab.id}`} className="text-sm text-white/60 hover:text-white">← Back</Link>
        <p className="mt-4 text-sm text-white/70">This report isn&apos;t available yet — results must be verified and released first.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/lab/${lab.id}`} className="text-sm text-white/60 hover:text-white">← Back</Link>
        <PrintPageButton label="Print / Save as PDF" />
      </div>

      <article className="rounded-2xl bg-white p-8 text-sm text-neutral-900 print:rounded-none print:p-0">
        <div className="flex items-start justify-between border-b border-neutral-200 pb-4">
          <div>
            <p className="text-xl font-bold">{SITE.name}</p>
            <p className="text-xs text-neutral-500">Laboratory report</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-neutral-500">Accession</p>
            <p className="font-mono font-semibold">{lab.accessionNumber}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1">
          <p><span className="text-neutral-500">Patient:</span> {fullName(lab.patient)}</p>
          <p><span className="text-neutral-500">Hospital no.:</span> <span className="font-mono">{lab.patient.hospitalNumber}</span></p>
          <p><span className="text-neutral-500">Sex / age:</span> {formatSex(lab.patient.sex)} · {lab.patient.dobEstimated ? "~" : ""}{ageFrom(lab.patient.dateOfBirth)} y</p>
          <p><span className="text-neutral-500">Requested by:</span> Dr {person(lab.requestedBy)}</p>
          <p><span className="text-neutral-500">Collected:</span> {lab.sampleCollectedAt ? formatDateTime(lab.sampleCollectedAt) : "—"}</p>
          <p><span className="text-neutral-500">Released:</span> {formatDateTime(lab.verifiedAt)}</p>
        </div>

        <h2 className="mt-6 text-base font-semibold">{lab.testName}</h2>
        <table className="mt-2 w-full text-left">
          <thead className="border-b border-neutral-300 text-[11px] uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="py-1.5 font-medium">Test</th>
              <th className="py-1.5 font-medium">Result</th>
              <th className="py-1.5 font-medium">Unit</th>
              <th className="py-1.5 font-medium">Reference</th>
              <th className="py-1.5 font-medium">Flag</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {lab.results.map((r) => (
              <tr key={r.id}>
                <td className="py-1.5">{r.analyteName}</td>
                <td className={`py-1.5 ${r.flag ? "font-bold" : ""}`}>{r.value}</td>
                <td className="py-1.5 text-neutral-600">{r.unit ?? ""}</td>
                <td className="py-1.5 text-neutral-600">{r.refText ?? "—"}</td>
                <td className="py-1.5 font-bold" title={r.flag ? FLAG_LABELS[r.flag] : ""}>{r.flag ? FLAG_SHORT[r.flag] : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[11px] text-neutral-500">Flags: L low · H high · LL critically low · HH critically high · A abnormal</p>

        {lab.resultComment && <p className="mt-4"><span className="text-neutral-500">Comment:</span> {lab.resultComment}</p>}

        <div className="mt-8 grid grid-cols-2 gap-6 border-t border-neutral-200 pt-4 text-xs">
          <div>
            <p className="text-neutral-500">Performed by</p>
            <p className="font-medium">{person(lab.resultedBy)}</p>
            <p className="text-neutral-500">{formatDateTime(lab.resultedAt)}</p>
          </div>
          <div>
            <p className="text-neutral-500">Verified by</p>
            <p className="font-medium">{person(lab.verifiedBy)}</p>
            <p className="text-neutral-500">{formatDateTime(lab.verifiedAt)}</p>
          </div>
        </div>
      </article>
    </div>
  );
}
