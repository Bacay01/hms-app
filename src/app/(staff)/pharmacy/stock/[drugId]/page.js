import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/nav";
import { DRUG_BY_ID } from "@/lib/drugs";
import { formatNaira } from "@/lib/money";
import { formatDateTime } from "@/lib/patients";
import { units } from "@/lib/prescribing";
import { NEAR_EXPIRY_DAYS, daysUntil } from "@/lib/stock";
import { localDate } from "@/lib/time";

const MOVE_LABELS = { RECEIVED: "Received", DISPENSED: "Dispensed", ADJUSTED: "Adjusted", RETURNED: "Returned" };

export default function DrugStockPage({ params }) {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading…</p>}>
      <DrugStock params={params} />
    </Suspense>
  );
}

async function DrugStock({ params }) {
  const session = await requirePermission("pharmacy.read");
  const { drugId } = await params;
  const drug = DRUG_BY_ID.get(drugId);
  if (!drug) notFound();
  const today = localDate();

  const [batches, movements, ledger] = await Promise.all([
    prisma.stockBatch.findMany({ where: { drugId }, orderBy: [{ expiryDate: "asc" }, { createdAt: "asc" }] }),
    prisma.stockMovement.findMany({
      where: { drugId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { firstName: true } }, batch: { select: { batchNumber: true } } },
    }),
    // Re-add the ledger per batch: it must equal quantityOnHand
    prisma.stockMovement.groupBy({ by: ["batchId"], where: { drugId }, _sum: { quantity: true } }),
  ]);
  const ledgerSum = new Map(ledger.map((l) => [l.batchId, l._sum.quantity ?? 0]));
  const mismatches = batches.filter((b) => (ledgerSum.get(b.id) ?? 0) !== b.quantityOnHand);

  return (
    <div className="max-w-5xl">
      <Link href="/pharmacy/stock" className="text-sm text-white/60 hover:text-white">← Stock</Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{drug.name}</h1>
          <p className="mt-1 text-sm text-white/60">Batches in expiry order — the order they will be dispensed (oldest expiry first).</p>
        </div>
        {can(session.permissions, "inventory.manage") && (
          <Link href={`/pharmacy/receive?drug=${drug.id}`} className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold hover:bg-accent-hover">
            Receive this drug
          </Link>
        )}
      </div>

      {mismatches.length > 0 ? (
        <p className="mt-4 rounded-xl border border-accent/40 bg-accent/15 px-4 py-2.5 text-sm text-red-100">
          Ledger mismatch on {mismatches.length} batch(es) — on-hand doesn&apos;t equal the sum of movements. Investigate before dispensing.
        </p>
      ) : (
        batches.length > 0 && <p className="mt-4 text-xs text-white/45">✓ Ledger reconciled: every batch&apos;s on-hand equals the sum of its movements.</p>
      )}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wider text-white/45">
            <tr>
              <th className="px-4 py-3 font-medium">Batch</th>
              <th className="px-4 py-3 font-medium">Expiry</th>
              <th className="px-4 py-3 text-right font-medium">On hand</th>
              <th className="px-4 py-3 text-right font-medium">Received</th>
              <th className="px-4 py-3 font-medium">Supplier</th>
              <th className="px-4 py-3 text-right font-medium">Cost / unit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {batches.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-white/55">No stock received yet.</td>
              </tr>
            )}
            {batches.map((b) => {
              const days = daysUntil(b.expiryDate, today);
              return (
                <tr key={b.id} className={b.quantityOnHand === 0 ? "text-white/35" : ""}>
                  <td className="px-4 py-2.5 font-mono text-xs">{b.batchNumber}</td>
                  <td className="px-4 py-2.5">
                    {b.expiryDate}{" "}
                    <span className={`text-xs ${days < 0 ? "font-semibold text-red-200" : days <= NEAR_EXPIRY_DAYS ? "text-red-200" : "text-white/45"}`}>
                      {days < 0 ? "EXPIRED" : `${days} days`}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold">{units(b.quantityOnHand, drug.unit)}</td>
                  <td className="px-4 py-2.5 text-right text-white/60">{b.quantityReceived}</td>
                  <td className="px-4 py-2.5 text-white/60">{b.supplier ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right text-white/60">{b.costKobo != null ? formatNaira(b.costKobo) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 text-sm font-semibold">Ledger — last 50 movements</h2>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wider text-white/45">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Movement</th>
              <th className="px-4 py-3 text-right font-medium">Qty</th>
              <th className="px-4 py-3 font-medium">Batch</th>
              <th className="px-4 py-3 font-medium">By / reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {movements.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-white/55">No movements yet.</td>
              </tr>
            )}
            {movements.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-2.5 text-white/70">{formatDateTime(m.createdAt)}</td>
                <td className="px-4 py-2.5">{MOVE_LABELS[m.type]}</td>
                <td className={`px-4 py-2.5 text-right font-semibold ${m.quantity < 0 ? "text-red-200" : ""}`}>
                  {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-white/60">{m.batch.batchNumber}</td>
                <td className="px-4 py-2.5 text-white/60">
                  {m.user.firstName}
                  {m.reason ? ` · ${m.reason}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
