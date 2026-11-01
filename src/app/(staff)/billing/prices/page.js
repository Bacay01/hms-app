import { Suspense } from "react";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AddServiceForm, LoadDefaultsButton, PriceRow } from "./PriceEditor";

const CATEGORY_LABELS = {
  CONSULTATION: "Consultations",
  LAB: "Laboratory tests",
  DRUG: "Drugs (per unit)",
  PROCEDURE: "Procedures",
  BED: "Beds",
  OTHER: "Other",
};

export default function PricesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading prices…</p>}>
      <PriceList />
    </Suspense>
  );
}

async function PriceList() {
  await requirePermission("billing.refunds.approve");
  const prices = await prisma.servicePrice.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
  const groups = Object.keys(CATEGORY_LABELS)
    .map((cat) => ({ cat, items: prices.filter((p) => p.category === cat) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="max-w-5xl">
      <Link href="/billing" className="text-sm text-white/60 hover:text-white">← Billing</Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Price list</h1>
          <p className="mt-1 text-sm text-white/60">
            {prices.length} services. Changing a price affects new bills only — items already billed keep their price.
          </p>
        </div>
        <LoadDefaultsButton />
      </div>

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-sm font-semibold">Add a service</h2>
        <div className="mt-4">
          <AddServiceForm />
        </div>
      </section>

      {groups.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-sm text-white/60">
          No prices yet. Click <span className="text-white">Load default price list</span> to start.
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.cat} className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-sm font-semibold">
              {CATEGORY_LABELS[g.cat]} <span className="text-white/40">({g.items.length})</span>
            </h2>
            <div className="mt-2 divide-y divide-white/5">
              {g.items.map((p) => (
                <PriceRow key={p.id} price={{ code: p.code, name: p.name, unit: p.unit, priceKobo: p.priceKobo, isActive: p.isActive }} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
