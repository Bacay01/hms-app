import { Suspense } from "react";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TriageQueue } from "@/lib/dsa/TriageQueue";
import { fullName } from "@/lib/patients";
import { ACTIVE_STATUSES, ENCOUNTER_STATUS_LABELS, PRIORITIES, labelOf } from "@/lib/queue";
import { dayRange, localDate } from "@/lib/time";

export default function ConsultationsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading…</p>}>
      <ConsultationList />
    </Suspense>
  );
}

async function ConsultationList() {
  const session = await requirePermission("clinical.read");
  const { start, end } = dayRange(localDate());

  const encounters = await prisma.encounter.findMany({
    where: {
      startedAt: { gte: start, lt: end },
      status: { in: ACTIVE_STATUSES },
      // Doctors see their own patients; nurses see everyone
      ...(session.role === "DOCTOR" ? { doctorId: session.userId } : {}),
    },
    include: {
      patient: { select: { firstName: true, lastName: true, otherNames: true, hospitalNumber: true } },
      doctor: { select: { lastName: true } },
      _count: { select: { vitals: true } },
    },
  });

  // Same triage order as the queue board: Emergency → Urgent → Normal, then by number
  const ordered = new TriageQueue(encounters).inOrder();

  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-bold tracking-tight">Consultations</h1>
      <p className="mt-1 text-sm text-white/60">
        Today&apos;s active visits, most urgent first{session.role === "DOCTOR" ? " — your patients" : ""}.
      </p>

      {ordered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-sm text-white/60">
          No active visits right now.
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wider text-white/45">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Patient</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Vitals</th>
                <th className="px-4 py-3 font-medium">Doctor</th>
                <th className="px-4 py-3 text-right font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {ordered.map((e) => (
                <tr key={e.id} className="hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-mono">{e.queueNumber}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {fullName(e.patient)}
                      {e.priority !== "NORMAL" && (
                        <span
                          className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                            e.priority === "EMERGENCY" ? "bg-accent text-white" : "border border-accent/60 text-red-200"
                          }`}
                        >
                          {labelOf(PRIORITIES, e.priority)}
                        </span>
                      )}
                    </p>
                    <p className="font-mono text-xs text-white/45">{e.patient.hospitalNumber}</p>
                  </td>
                  <td className="px-4 py-3 text-white/75">{ENCOUNTER_STATUS_LABELS[e.status]}</td>
                  <td className="px-4 py-3">
                    {e._count.vitals > 0 ? (
                      <span className="text-white/75">Taken</span>
                    ) : (
                      <span className="text-red-200">Needed</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/70">{e.doctor ? `Dr ${e.doctor.lastName}` : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/consultations/${e.id}`}
                      className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold hover:bg-accent-hover"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
