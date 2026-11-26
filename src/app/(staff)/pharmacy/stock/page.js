import { Suspense } from "react";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/nav";
import { DRUGS } from "@/lib/drugs";
import { units } from "@/lib/prescribing";
import { daysUntil, summariseStock } from "@/lib/stock";
import { localDate } from "@/lib/time";
import DemoStockButton from "../DemoStockButton";
import PharmacyTabs from "../PharmacyTabs";

const FLAG = {
  OUT: { label: "Out of stock", style: "bg-accent text-white" },
  EXPIRED: { label: "Expired on shelf", style: "bg-accent text-white" },
  LOW: { label: "Low", style: "border border-accent/60 text-red-200" },
  EXPIRING: { label: "Expiring ≤ 90 days", style: "border border-white/25 text-white/80" },
};
const SEVERITY = ["OUT", "EXPIRED", "LOW", "EXPIRING"];

export default function StockPage({ searchParams }) {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading stock…</p>}>
      <Stock searchParams={searchParams} />
    </Suspense>
  );
}

async function Stock({ searchParams }) {
  const session = await requirePermission("pharmacy.read");
  const canManage = can(session.permissions, "inventory.manage");
  const { show = "" } = await searchParams;
  const today = localDate();

  const [batches, totalBatches] = await Promise.all([
    prisma.stockBatch.findMany({ where: { quantityOnHand: { gt: 0 } }, select: { drugId: true, expiryDate: true, quantityOnHand: true } }),
    prisma.stockBatch.count(),
  ]);

  const rank = (s) => Math.min(...s.flags.map((f) => SEVERITY.indexOf(f)), 99);
  const summary = summariseStock(DRUGS, batches, today).sort((a, b) => rank(a) - rank(b) || a.drug.name.localeCompare(b.drug.name));
  const count = (flag) => summary.filter((s) => s.flags.includes(flag)).length;
  const rows = show === "alerts" ? summary.filter((s) => s.flags.length > 0) : summary;

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pharmacy stock</h1>
          <p className="mt-1 text-sm text-white/60">Usable stock counts unexpired batches only.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManage && totalBatches === 0 && process.env.NODE_ENV !== "production" && <DemoStockButton />}
          {canManage && (
            <Link href="/pharmacy/receive" className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold hover:bg-accent-hover">
              Receive stock
            </Link>
          )}
        </div>
      </div>

      <div className="mt-4">
        <PharmacyTabs active="stock" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        {SEVERITY.map((f) => (
          <div key={f} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-wider text-white/45">{FLAG[f].label}</p>
            <p className={`mt-1 text-2xl font-bold ${count(f) && f !== "EXPIRING" ? "text-red-200" : ""}`}>{count(f)}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-2 text-sm">
        <Link href="/pharmacy/stock" className={`rounded-full px-4 py-1.5 ${show !== "alerts" ? "bg-white/15" : "border border-white/15 hover:bg-white/10"}`}>
          All drugs
        </Link>
        <Link href="/pharmacy/stock?show=alerts" className={`rounded-full px-4 py-1.5 ${show === "alerts" ? "bg-white/15" : "border border-white/15 hover:bg-white/10"}`}>
          Alerts only
        </Link>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wider text-white/45">
            <tr>
              <th className="px-4 py-3 font-medium">Drug</th>
              <th className="px-4 py-3 text-right font-medium">Usable stock</th>
              <th className="px-4 py-3 text-right font-medium">Batches</th>
              <th className="px-4 py-3 font-medium">Next expiry</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((s) => (
              <tr key={s.drug.id} className="hover:bg-white/[0.03]">
                <td className="px-4 py-2.5">
                  <Link href={`/pharmacy/stock/${s.drug.id}`} className="font-medium hover:underline">
                    {s.drug.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-right">
                  {units(s.usable, s.drug.unit)}
                  <span className="block text-xs text-white/40">reorder below {s.reorder}</span>
                </td>
                <td className="px-4 py-2.5 text-right text-white/70">{s.batches}</td>
                <td className="px-4 py-2.5 text-white/70">
                  {s.nextExpiry ? (
                    <>
                      {s.nextExpiry} <span className="text-xs text-white/45">({daysUntil(s.nextExpiry, today)} days)</span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    {s.flags.map((f) => (
                      <span key={f} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${FLAG[f].style}`}>
                        {FLAG[f].label}
                      </span>
                    ))}
                    {s.flags.length === 0 && <span className="text-xs text-white/45">OK</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
