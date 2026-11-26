import { Suspense } from "react";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createHmo, createPlan, loadDemoHmos } from "./actions";
import { HmoForm, PlanForm, SimpleAction } from "./HmoForms";

const CAT_LABEL = { CONSULTATION: "Consult", LAB: "Lab", DRUG: "Drugs", BED: "Bed", PROCEDURE: "Procedures" };

export default function HmoPage() {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading HMOs…</p>}>
      <Hmos />
    </Suspense>
  );
}

async function Hmos() {
  await requirePermission("hmo.manage");
  const hmos = await prisma.hmo.findMany({
    orderBy: { name: "asc" },
    include: { plans: { orderBy: { name: "asc" }, include: { coverage: true, _count: { select: { enrolments: { where: { isActive: true } } } } } } },
  });

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">HMO / NHIA</h1>
          <p className="mt-1 text-sm text-white/60">Plans set what each HMO pays per category, and which services need pre-authorization.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/hmo/enrolments" className="rounded-full border border-white/15 px-5 py-2.5 text-sm hover:bg-white/10">Enrolments</Link>
          <Link href="/hmo/claims" className="rounded-full border border-white/15 px-5 py-2.5 text-sm hover:bg-white/10">Monthly claims</Link>
        </div>
      </div>

      {hmos.length === 0 && process.env.NODE_ENV !== "production" && (
        <div className="mt-6">
          <SimpleAction action={loadDemoHmos} label="Load demo HMOs (dev only)" className="rounded-full border border-dashed border-white/25 px-4 py-2 text-sm text-white/70 hover:bg-white/10" />
        </div>
      )}

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-sm font-semibold">Add an HMO</h2>
        <div className="mt-3"><HmoForm action={createHmo} /></div>
      </section>

      {hmos.map((h) => (
        <section key={h.id} className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="font-semibold">
            {h.name} <span className="font-mono text-xs text-white/45">{h.code}</span>
            {h.isNhia && <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase">NHIA</span>}
          </h2>
          {h.plans.length === 0 ? (
            <p className="mt-2 text-sm text-white/55">No plans yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {h.plans.map((p) => (
                <li key={p.id} className="rounded-xl border border-white/10 p-3 text-sm">
                  <p className="font-medium">
                    {p.name} <span className="text-xs text-white/45">· {p._count.enrolments} enrolled</span>
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {p.coverage.map((c) => (
                      <span key={c.id} className={`rounded-full px-2 py-0.5 text-xs ${c.percent ? "bg-white/10" : "text-white/40"}`}>
                        {CAT_LABEL[c.category] ?? c.category} {c.percent}%{c.requiresPreauth ? " · pre-auth" : ""}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-white/60 hover:text-white">Add a plan to {h.name}</summary>
            <div className="mt-3"><PlanForm action={createPlan.bind(null, h.id)} /></div>
          </details>
        </section>
      ))}
    </div>
  );
}
