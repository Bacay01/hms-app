import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/nav";
import { analytesFor } from "@/lib/labCatalogue";
import { LAB_STATUS_LABELS } from "@/lib/labTests";
import { ageFrom, formatDateTime, formatSex, fullName } from "@/lib/patients";
import { saveResults } from "./actions";
import { verifyResults } from "./verify-actions";
import ResultForm, { FlagChip } from "./ResultForm";
import VerifyPanel from "./VerifyPanel";

export default function LabTestPage({ params }) {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading…</p>}>
      <LabTest params={params} />
    </Suspense>
  );
}

function ResultsTable({ results }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="text-xs uppercase tracking-wider text-white/45">
        <tr>
          <th className="py-2 font-medium">Test</th>
          <th className="py-2 font-medium">Result</th>
          <th className="py-2 font-medium">Reference</th>
          <th className="py-2 font-medium" />
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {results.map((r) => (
          <tr key={r.id}>
            <td className="py-2">{r.analyteName}</td>
            <td className={`py-2 font-semibold ${r.flag ? "text-red-200" : ""}`}>
              {r.value} {r.unit}
            </td>
            <td className="py-2 text-white/55">{r.refText ?? "—"}</td>
            <td className="py-2">
              <FlagChip flag={r.flag} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

async function LabTest({ params }) {
  const session = await requirePermission("lab.requests.read");
  const { id } = await params;

  const lab = await prisma.labRequest.findUnique({
    where: { id },
    include: {
      patient: { select: { firstName: true, lastName: true, otherNames: true, hospitalNumber: true, sex: true, dateOfBirth: true, dobEstimated: true } },
      requestedBy: { select: { lastName: true } },
      sampleCollectedBy: { select: { firstName: true, lastName: true } },
      resultedBy: { select: { firstName: true, lastName: true } },
      verifiedBy: { select: { firstName: true, lastName: true } },
      results: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!lab) notFound();

  const canWrite = can(session.permissions, "lab.results.write");
  const canVerifyPerm = can(session.permissions, "lab.results.verify");
  const isResulter = lab.resultedById === session.userId;
  const age = ageFrom(lab.patient.dateOfBirth);

  // IN_PROGRESS: anyone on the bench can enter. RESULTED: only whoever entered can still correct —
  // everyone else sees it read-only so they can VERIFY it.
  const editable = canWrite && (lab.status === "IN_PROGRESS" || (lab.status === "RESULTED" && isResulter));
  const showVerify = lab.status === "RESULTED" && canVerifyPerm && !isResulter;
  // Doctors see values only once released
  const showValues = lab.status === "COMPLETED" || canWrite || canVerifyPerm;

  return (
    <div className="max-w-4xl">
      <Link href="/lab" className="text-sm text-white/60 hover:text-white">← Laboratory</Link>

      <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{lab.testName}</h1>
            <p className="mt-1 text-sm text-white/60">
              {fullName(lab.patient)} <span className="font-mono">{lab.patient.hospitalNumber}</span> · {formatSex(lab.patient.sex)} ·{" "}
              {lab.patient.dobEstimated ? "~" : ""}
              {age} y
            </p>
          </div>
          <div className="text-right">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase text-white/80">{LAB_STATUS_LABELS[lab.status]}</span>
            {lab.accessionNumber && <p className="mt-2 font-mono text-sm">{lab.accessionNumber}</p>}
          </div>
        </div>
        <p className="mt-3 text-xs text-white/50">
          Requested by Dr {lab.requestedBy.lastName}, {formatDateTime(lab.createdAt)}
          {lab.sampleCollectedAt && ` · collected ${formatDateTime(lab.sampleCollectedAt)} by ${lab.sampleCollectedBy?.firstName ?? "—"}`}
          {lab.resultedAt && ` · resulted ${formatDateTime(lab.resultedAt)} by ${lab.resultedBy?.firstName ?? "—"}`}
          {lab.verifiedAt && ` · verified ${formatDateTime(lab.verifiedAt)} by ${lab.verifiedBy?.firstName ?? "—"}`}
        </p>
        {lab.clinicalNote && <p className="mt-2 text-sm text-white/75">Clinical note: {lab.clinicalNote}</p>}
        {lab.status === "COMPLETED" && (
          <Link href={`/lab/${lab.id}/print`} className="mt-3 inline-block rounded-full bg-accent px-4 py-1.5 text-xs font-semibold hover:bg-accent-hover">
            View / print report
          </Link>
        )}
      </div>

      {lab.returnNote && lab.status === "IN_PROGRESS" && (
        <div className="mt-4 rounded-xl border border-accent/40 bg-accent/15 px-4 py-3 text-sm text-red-100">
          <span className="font-semibold">Returned for correction:</span> {lab.returnNote}
        </div>
      )}

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-sm font-semibold">
          {editable ? (lab.status === "RESULTED" ? "Your results — awaiting verification by another scientist (you can still correct them)" : "Enter results") : "Results"}
        </h2>
        <div className="mt-2">
          {editable ? (
            <ResultForm
              action={saveResults.bind(null, lab.id)}
              analytes={analytesFor(lab.testCode)}
              patient={{ sex: lab.patient.sex, age }}
              initial={Object.fromEntries(lab.results.map((r) => [r.analyteCode, r.value]))}
              initialComment={lab.resultComment}
            />
          ) : !showValues ? (
            <p className="py-3 text-sm text-white/55">Results will appear here once verified and released.</p>
          ) : lab.results.length === 0 ? (
            <p className="py-3 text-sm text-white/55">No results yet.</p>
          ) : (
            <ResultsTable results={lab.results} />
          )}
        </div>
        {!editable && showValues && lab.resultComment && <p className="mt-3 text-sm text-white/70">Comment: {lab.resultComment}</p>}
      </section>

      {showVerify && (
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-sm font-semibold">Verification</h2>
          <p className="mt-1 text-xs text-white/50">
            Entered by {lab.resultedBy?.firstName} {lab.resultedBy?.lastName}. Check every value against the analyser printout before releasing.
          </p>
          <div className="mt-4">
            <VerifyPanel action={verifyResults.bind(null, lab.id)} resultedAt={lab.resultedAt.toISOString()} />
          </div>
        </section>
      )}
    </div>
  );
}
