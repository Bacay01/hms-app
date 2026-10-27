import { Suspense } from "react";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { NAV_GROUPS, can, formatRole } from "@/lib/nav";

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading…</p>}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const session = await requireSession();
  const firstName = session.name.split(" ")[0];
  const modules = NAV_GROUPS.flatMap((g) => g.items).filter(
    (item) => item.href !== "/dashboard" && can(session.permissions, item.permission)
  );

  return (
    <div className="max-w-5xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent">
        {formatRole(session.role)}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Welcome back, {firstName}</h1>
      <p className="mt-1 text-sm text-white/60">Here is what you can work on today.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {modules.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition-colors hover:border-white/20 hover:bg-white/[0.07]"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{m.label}</h2>
              <span className="inline-block text-white/40 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white">
                ↗
              </span>
            </div>
            <p className="mt-2 text-sm text-white/55">{m.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
