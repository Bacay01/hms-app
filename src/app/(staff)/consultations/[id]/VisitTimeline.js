import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buildVisitTimeline } from "@/lib/visitTimeline";
import { formatDateTime } from "@/lib/patients";
import { ENCOUNTER_STATUS_LABELS, VISIT_TYPES, labelOf } from "@/lib/queue";

const OUTCOME_LABELS = { DISCHARGED: "Discharged", REFERRED: "Referred", ADMITTED: "Admitted" };

export default async function VisitTimeline({ patientId, currentId }) {
  const encounters = await prisma.encounter.findMany({
    where: { patientId },
    orderBy: { startedAt: "desc" },
    take: 50,
    select: {
      id: true,
      startedAt: true,
      status: true,
      visitType: true,
      reason: true,
      outcome: true,
      doctor: { select: { lastName: true } },
      diagnoses: {
        where: { removedAt: null },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        take: 1,
        select: { name: true },
      },
    },
  });

  // Doubly linked list in date order: O(1) jump to this visit, then .prev / .next
  const { list, nodeById } = buildVisitTimeline(encounters);
  const current = nodeById.get(currentId);
  const prev = current?.prev?.value ?? null;
  const next = current?.next?.value ?? null;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Visit timeline</h2>
        <span className="text-xs text-white/45">
          {list.length} visit{list.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs">
        {prev ? (
          <Link href={`/consultations/${prev.id}`} className="text-white/70 hover:text-white">
            ← Previous visit
          </Link>
        ) : (
          <span className="text-white/30">First visit</span>
        )}
        {next ? (
          <Link href={`/consultations/${next.id}`} className="text-white/70 hover:text-white">
            Next visit →
          </Link>
        ) : (
          <span className="text-white/30">Latest visit</span>
        )}
      </div>

      {/* Newest first: walk the list backwards from the tail */}
      <ol className="mt-4 space-y-2">
        {[...list.reversed()].map((e) => (
          <li key={e.id}>
            <Link
              href={`/consultations/${e.id}`}
              className={`block rounded-xl border px-3 py-2 text-xs ${
                e.id === currentId ? "border-accent/50 bg-accent/10" : "border-white/10 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-white">{formatDateTime(e.startedAt)}</span>
                <span className="text-white/55">{e.outcome ? OUTCOME_LABELS[e.outcome] : ENCOUNTER_STATUS_LABELS[e.status]}</span>
              </div>
              <p className="mt-0.5 text-white/55">
                {labelOf(VISIT_TYPES, e.visitType)} · {e.doctor ? `Dr ${e.doctor.lastName}` : "—"} ·{" "}
                {e.diagnoses[0]?.name ?? e.reason ?? "No diagnosis"}
              </p>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
