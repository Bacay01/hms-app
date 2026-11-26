import { Suspense } from "react";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/nav";
import { DRUG_BY_ID } from "@/lib/drugs";
import { orderPharmacyQueue } from "@/lib/dispensing";
import { paymentStatusesForEncounters } from "@/lib/labPayments";
import { waitedText } from "@/lib/labWorklist";
import { ageFrom, formatDateTime, formatSex, fullName, hasKnownAllergies } from "@/lib/patients";
import { FREQUENCIES, units } from "@/lib/prescribing";
import { summariseStock } from "@/lib/stock";
import { dayRange, localDate } from "@/lib/time";
import PayBadge from "@/components/staff/PayBadge";
import DispenseButton from "./DispenseButton";
import PharmacyTabs from "./PharmacyTabs";

const PRIORITY_STYLE = { EMERGENCY: "bg-accent text-white", URGENT: "border border-accent/60 text-red-200" };
const freqLabel = (code) => FREQUENCIES.find((f) => f.code === code)?.label ?? code;

export default function PharmacyQueuePage() {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading prescriptions…</p>}>
      <Queue />
    </Suspense>
  );
}

async function Queue() {
  const session = await requirePermission("pharmacy.read");
  const canDispense = can(session.permissions, "pharmacy.dispense");
  const today = localDate();

  const pending = await prisma.prescription.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 300,
    include: {
      patient: { select: { firstName: true, lastName: true, otherNames: true, hospitalNumber: true, sex: true, dateOfBirth: true, dobEstimated: true, allergies: true } },
      prescribedBy: { select: { lastName: true } },
      encounter: { select: { priority: true } },
    },
  });

  const drugIds = [...new Set(pending.map((p) => p.drugId))];
  const [payments, batches, dispensedToday] = await Promise.all([
    paymentStatusesForEncounters([...new Set(pending.map((p) => p.encounterId))]),
    prisma.stockBatch.findMany({ where: { drugId: { in: drugIds }, quantityOnHand: { gt: 0 } }, select: { drugId: true, expiryDate: true, quantityOnHand: true } }),
    prisma.prescription.findMany({
      where: { status: "DISPENSED", dispensedAt: { gte: dayRange(today).start } },
      orderBy: { dispensedAt: "desc" },
      take: 10,
      include: { patient: { select: { firstName: true, lastName: true, otherNames: true } }, dispensedBy: { select: { firstName: true } } },
    }),
  ]);

  const stock = new Map(
    summariseStock(drugIds.map((id) => DRUG_BY_ID.get(id)).filter(Boolean), batches, today).map((s) => [s.drug.id, s])
  );

  // Group by visit (Map), then order the visits with the TriageQueue
  const byVisit = new Map();
  for (const rx of pending) {
    if (!byVisit.has(rx.encounterId)) {
      byVisit.set(rx.encounterId, { id: rx.encounterId, priority: rx.encounter.priority, patient: rx.patient, oldestAt: rx.createdAt, items: [] });
    }
    byVisit.get(rx.encounterId).items.push(rx);
  }
  const groups = orderPharmacyQueue([...byVisit.values()]);

  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-bold tracking-tight">Pharmacy</h1>
      <p className="mt-1 text-sm text-white/60">
        {pending.length} prescription{pending.length === 1 ? "" : "s"} waiting for {groups.length} patient{groups.length === 1 ? "" : "s"} — emergencies
        first, then longest waiting. Dispensed from the batch that expires soonest.
      </p>
      <div className="mt-4">
        <PharmacyTabs active="queue" />
      </div>

      {groups.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-sm text-white/60">
          No prescriptions waiting.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {groups.map((g) => (
            <section key={g.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex flex-wrap items-center gap-2">
                {g.priority !== "NORMAL" && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${PRIORITY_STYLE[g.priority]}`}>{g.priority.toLowerCase()}</span>
                )}
                <p className="font-semibold">{fullName(g.patient)}</p>
                <span className="font-mono text-xs text-white/45">{g.patient.hospitalNumber}</span>
                <span className="text-sm text-white/55">
                  · {formatSex(g.patient.sex)} · {g.patient.dobEstimated ? "~" : ""}
                  {ageFrom(g.patient.dateOfBirth)} y · waiting {waitedText(g.oldestAt)}
                </span>
              </div>
              {hasKnownAllergies(g.patient.allergies) && (
                <p className="mt-2 rounded-lg border border-accent/40 bg-accent/15 px-3 py-1.5 text-sm text-red-100">
                  <span className="font-semibold">Allergies:</span> {g.patient.allergies}
                </p>
              )}

              <ul className="mt-3 divide-y divide-white/5">
                {g.items.map((rx) => {
                  const s = stock.get(rx.drugId);
                  const usable = s?.usable ?? 0;
                  const enough = usable >= rx.quantity;
                  const payment = payments.get(rx.encounterId)?.get(rx.id) ?? null;
                  return (
                    <li key={rx.id} className="flex flex-wrap items-start justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="font-medium">{rx.drugName}</p>
                        <p className="text-sm text-white/70">
                          {units(rx.doseQty, rx.unit)} · {freqLabel(rx.frequency)}
                          {rx.frequency !== "STAT" && ` · ${rx.durationDays} day${rx.durationDays === 1 ? "" : "s"}`} →{" "}
                          <span className="font-semibold text-white">{units(rx.quantity, rx.unit)}</span>
                        </p>
                        {rx.instructions && <p className="text-xs text-white/55">{rx.instructions}</p>}
                        <p className="text-xs text-white/45">Dr {rx.prescribedBy.lastName} · {formatDateTime(rx.createdAt)}</p>
                        {rx.overrideReason && (
                          <p className="mt-1 text-xs text-red-200">Doctor overrode a serious warning: {rx.overrideReason}</p>
                        )}
                        <p className={`mt-1 text-xs ${enough ? "text-white/50" : "font-semibold text-red-200"}`}>
                          Usable stock: {units(usable, rx.unit)}
                          {s?.expired ? ` (+${s.expired} expired, not usable)` : ""}
                          {!enough && " — not enough to dispense"}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <PayBadge payment={payment} />
                        {canDispense && (
                          <DispenseButton
                            rx={{
                              id: rx.id,
                              payment,
                              emergency: rx.encounter.priority === "EMERGENCY",
                              enough,
                              label: `${units(rx.quantity, rx.unit)} of ${rx.drugName}`,
                            }}
                          />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {dispensedToday.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold">Dispensed today</h2>
          <ul className="mt-2 divide-y divide-white/5 rounded-2xl border border-white/10">
            {dispensedToday.map((rx) => (
              <li key={rx.id} className="flex flex-wrap justify-between gap-2 px-4 py-2.5 text-sm">
                <span>
                  {fullName(rx.patient)} · {units(rx.quantity, rx.unit)} {rx.drugName}
                  {rx.unpaidOverrideReason && <span className="text-xs text-red-200"> · unpaid: {rx.unpaidOverrideReason}</span>}
                </span>
                <span className="text-xs text-white/50">
                  {formatDateTime(rx.dispensedAt)} · {rx.dispensedBy?.firstName} ·{" "}
                  <Link href={`/pharmacy/label/${rx.id}`} className="underline">
                    Label
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
