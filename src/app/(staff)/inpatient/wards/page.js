import { Suspense } from "react";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatNaira } from "@/lib/money";
import { addBeds, createWard } from "./actions";
import { AddBedsForm, WardForm } from "../InpatientForms";

export default function WardsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading…</p>}>
      <Wards />
    </Suspense>
  );
}

async function Wards() {
  await requirePermission("staff.manage");
  const wards = await prisma.ward.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { beds: true } } } });

  return (
    <div className="max-w-4xl">
      <Link href="/inpatient" className="text-sm text-white/60 hover:text-white">← Inpatient</Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Ward setup</h1>
      <p className="mt-1 text-sm text-white/60">Rate changes apply to new bed stays; nights already charged keep their rate.</p>

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-sm font-semibold">New ward</h2>
        <div className="mt-4">
          <WardForm action={createWard} />
        </div>
      </section>

      <ul className="mt-6 divide-y divide-white/5 rounded-2xl border border-white/10">
        {wards.length === 0 && <li className="p-5 text-sm text-white/55">No wards yet.</li>}
        {wards.map((w) => (
          <li key={w.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <div>
              <p className="font-medium">{w.name}</p>
              <p className="text-xs text-white/50">
                {w.kind ? `${w.kind} · ` : ""}
                {w._count.beds} beds · {formatNaira(w.dailyRateKobo)} per night
              </p>
            </div>
            <AddBedsForm action={addBeds.bind(null, w.id)} />
          </li>
        ))}
      </ul>
    </div>
  );
}
