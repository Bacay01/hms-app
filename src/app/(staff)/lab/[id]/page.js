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
import ResultForm, { FlagChip } from "./ResultForm";

export default function LabTestPage({ params }) {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading…</p>}>
      <LabTest params={params} />
    </Suspense>
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
      results: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!lab) notFound();

  const analytes = analytesFor(lab.testCode);
  const age = ageFrom(lab.patient.dateOfBirth);
  const editable = can(session.permissions, "lab.results.write") && ["IN_PROGRESS", "RESULTED"].includes(lab.status);
  const initial = Object.fromEntries(lab.results.map((r) => [r.analyteCode, r.value]));

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
        </p>
        {lab.clinicalNote && <p className="mt-2 text-sm text-white/75">Clinical note: {lab.clinicalNote}</p>}
      </div>

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-sm font-semibold">{editable ? (lab.status === "RESULTED" ? "Results (awaiting verification — you can still correct them)" : "Enter results") : "Results"}</h2>
        <div className="mt-2">
          {editable ? (
            <ResultForm
              action={saveResults.bind(null, lab.id)}
              analytes={analytes}
              patient={{ sex: lab.patient.sex, age }}
              initial={initial}
              initialComment={lab.resultComment}
            />
          ) : lab.results.length === 0 ? (
            <p className="py-3 text-sm text-white/55">No results yet.</p>
          ) : (
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
                {lab.results.map((r) => (
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
          )}
        </div>
        {!editable && lab.resultComment && <p className="mt-3 text-sm text-white/70">Comment: {lab.resultComment}</p>}
      </section>
    </div>
  );
}
