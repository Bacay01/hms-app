import { Suspense } from "react";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/nav";
import { LAB_STATUS_LABELS } from "@/lib/labTests";
import { paymentStatusesForEncounters } from "@/lib/labPayments";
import { orderLabWorklist, waitedText } from "@/lib/labWorklist";
import { ageFrom, formatSex, fullName } from "@/lib/patients";
import PayBadge from "@/components/staff/PayBadge";
import LabActions from "./LabActions";

const ACTIVE = ["REQUESTED", "SAMPLE_COLLECTED", "IN_PROGRESS", "RESULTED"];
const PRIORITY_STYLE = {
  EMERGENCY: "bg-accent text-white",
  URGENT: "border border-accent/60 text-red-200",
};

export default function LabPage() {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading worklist…</p>}>
      <Worklist />
    </Suspense>
  );
}

async function Worklist() {
  const session = await requirePermission("lab.requests.read");
  const canWrite = can(session.permissions, "lab.results.write");

  const labs = await prisma.labRequest.findMany({
    where: { status: { in: ACTIVE } },
    take: 200,
    include: {
      patient: { select: { firstName: true, lastName: true, otherNames: true, hospitalNumber: true, sex: true, dateOfBirth: true, dobEstimated: true } },
      requestedBy: { select: { lastName: true } },
      sampleCollectedBy: { select: { firstName: true } },
      encounter: { select: { priority: true } },
    },
  });

  const payments = await paymentStatusesForEncounters([...new Set(labs.map((l) => l.encounterId))]);
  const ordered = orderLabWorklist(labs.map((l) => ({ ...l, encounterPriority: l.encounter.priority })));
  const count = (s) => labs.filter((l) => l.status === s).length;

  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-bold tracking-tight">Laboratory</h1>
      <p className="mt-1 text-sm text-white/60">
        {count("REQUESTED")} to collect · {count("SAMPLE_COLLECTED")} to start · {count("IN_PROGRESS")} in progress · {count("RESULTED")} awaiting verification — emergencies and urgent
        tests first, then oldest.
      </p>

      {ordered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-sm text-white/60">
          No tests waiting.
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {ordered.map((l) => {
            const payment = payments.get(l.encounterId)?.get(l.id) ?? null;
            return (
              <li key={l.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {l.priority !== "NORMAL" && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${PRIORITY_STYLE[l.priority]}`}>
                          {l.priority.toLowerCase()}
                        </span>
                      )}
                      <p className="font-semibold">{l.testName}</p>
                      {l.accessionNumber && <span className="font-mono text-xs text-white/60">{l.accessionNumber}</span>}
                    </div>
                    <p className="mt-1 text-sm">
                      {fullName(l.patient)} <span className="font-mono text-xs text-white/45">{l.patient.hospitalNumber}</span>
                      <span className="text-white/55">
                        {" "}
                        · {formatSex(l.patient.sex)} · {l.patient.dobEstimated ? "~" : ""}
                        {ageFrom(l.patient.dateOfBirth)} y
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-white/50">
                      Dr {l.requestedBy.lastName} · waiting {waitedText(l.createdAt)}
                      {l.sampleCollectedBy ? ` · collected by ${l.sampleCollectedBy.firstName}` : ""}
                    </p>
                    {l.clinicalNote && <p className="mt-1 text-xs text-white/70">Note: {l.clinicalNote}</p>}
                    {l.unpaidOverrideReason && <p className="mt-1 text-xs text-red-200">Collected unpaid: {l.unpaidOverrideReason}</p>}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <PayBadge payment={payment} />
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase text-white/70">{LAB_STATUS_LABELS[l.status]}</span>
                    </div>
                    {canWrite && (
                      <LabActions lab={{ id: l.id, status: l.status, payment, emergency: l.priority === "EMERGENCY" }} />
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
