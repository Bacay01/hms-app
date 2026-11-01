import { Suspense } from "react";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/nav";
import { syncEncounterBill } from "@/lib/billing";
import { formatNaira } from "@/lib/money";
import { formatDateTime, fullName } from "@/lib/patients";
import { dayRange, localDate } from "@/lib/time";

export default function BillingPage() {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading bills…</p>}>
      <BillingList />
    </Suspense>
  );
}

async function BillingList() {
  const session = await requirePermission("billing.read");

  // Today's visits that don't have a bill yet get one now (consultation fee etc.)
  const { start, end } = dayRange(localDate());
  const todays = await prisma.encounter.findMany({
    where: { startedAt: { gte: start, lt: end } },
    select: { id: true },
  });
  const billed = await prisma.bill.findMany({
    where: { encounterId: { in: todays.map((e) => e.id) } },
    select: { encounterId: true },
  });
  const hasBill = new Set(billed.map((b) => b.encounterId)); // O(1) "already billed?" checks
  for (const e of todays) {
    if (!hasBill.has(e.id)) await syncEncounterBill(e.id);
  }


  // Bills with unpriced items are re-checked, so a newly set price shows up straight away
  const unpriced = await prisma.billItem.findMany({
    where: { priceMissing: true, status: "ACTIVE" },
    distinct: ["billId"],
    select: { bill: { select: { encounterId: true } } },
  });
  for (const u of unpriced) await syncEncounterBill(u.bill.encounterId);

  const bills = await prisma.bill.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      patient: { select: { firstName: true, lastName: true, otherNames: true, hospitalNumber: true } },
      encounter: { select: { startedAt: true } },
      _count: { select: { items: { where: { priceMissing: true, status: "ACTIVE" } } } },
    },
  });

  const outstanding = bills.filter((b) => b.totalKobo > b.paidKobo || b._count.items > 0); // unpriced bills never hide
  const totalOwed = outstanding.reduce((sum, b) => sum + (b.totalKobo - b.paidKobo), 0);

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
          <p className="mt-1 text-sm text-white/60">Outstanding bills, newest first.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/billing/daily" className="rounded-full border border-white/15 px-5 py-2.5 text-sm hover:bg-white/10">
            End-of-day report
          </Link>
          {can(session.permissions, "billing.refunds.approve") && (
            <>
              <Link href="/billing/approvals" className="rounded-full border border-white/15 px-5 py-2.5 text-sm hover:bg-white/10">
                Approvals
              </Link>
              <Link href="/billing/prices" className="rounded-full border border-white/15 px-5 py-2.5 text-sm hover:bg-white/10">
                Price list
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xs uppercase tracking-wider text-white/45">Total outstanding</p>
          <p className="mt-1 text-3xl font-bold">{formatNaira(totalOwed)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xs uppercase tracking-wider text-white/45">Bills waiting</p>
          <p className="mt-1 text-3xl font-bold">{outstanding.length}</p>
        </div>
      </div>

      {outstanding.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-sm text-white/60">
          No outstanding bills.
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wider text-white/45">
              <tr>
                <th className="px-4 py-3 font-medium">Patient</th>
                <th className="px-4 py-3 font-medium">Visit</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 text-right font-medium">Paid</th>
                <th className="px-4 py-3 text-right font-medium">Balance</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {outstanding.map((b) => (
                <tr key={b.id} className="hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <p className="font-medium">{fullName(b.patient)}</p>
                    <p className="font-mono text-xs text-white/45">{b.patient.hospitalNumber}</p>
                    {b._count.items > 0 && <p className="text-xs text-red-200">{b._count.items} item(s) with no price</p>}
                  </td>
                  <td className="px-4 py-3 text-white/70">{formatDateTime(b.encounter.startedAt)}</td>
                  <td className="px-4 py-3 text-right">{formatNaira(b.totalKobo)}</td>
                  <td className="px-4 py-3 text-right text-white/70">{formatNaira(b.paidKobo)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatNaira(b.totalKobo - b.paidKobo)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/billing/${b.id}`} className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold hover:bg-accent-hover">
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
