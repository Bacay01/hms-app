import { Suspense } from "react";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/patients";

const PAGE_SIZE = 100;

export default function AuditPage({ searchParams }) {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading audit log…</p>}>
      <AuditLog searchParams={searchParams} />
    </Suspense>
  );
}

function shortDetails(details) {
  if (!details || typeof details !== "object") return "";
  return Object.entries(details)
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
    .join(" · ");
}

async function AuditLog({ searchParams }) {
  await requirePermission("audit.read");
  const { q = "", before = "" } = await searchParams;
  const filter = String(q).trim();
  const beforeDate = before && !Number.isNaN(Date.parse(String(before))) ? new Date(String(before)) : null;

  const entries = await prisma.auditLog.findMany({
    where: {
      ...(filter ? { action: { contains: filter, mode: "insensitive" } } : {}),
      ...(beforeDate ? { createdAt: { lt: beforeDate } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    include: { user: { select: { firstName: true, lastName: true, role: { select: { name: true } } } } },
  });

  // Cursor paging: "older" = everything before the last entry shown
  const older = entries.length === PAGE_SIZE ? entries[entries.length - 1].createdAt.toISOString() : null;
  const query = (extra) => `/audit?${new URLSearchParams({ ...(filter ? { q: filter } : {}), ...extra })}`;

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit log</h1>
          <p className="mt-1 text-sm text-white/60">Who did what, and when. Read-only — entries can never be edited or deleted.</p>
        </div>
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={filter}
            placeholder="Filter actions: lab. · payment · patient.view"
            className="w-72 rounded-full border border-white/15 bg-black/30 px-4 py-2 text-sm text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none"
          />
          <button className="rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/10">Filter</button>
          {filter && (
            <Link href="/audit" className="self-center text-sm text-white/60 hover:text-white">
              Clear
            </Link>
          )}
        </form>
      </div>

      {entries.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-sm text-white/60">No entries.</div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wider text-white/45">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Who</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Record</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {entries.map((e) => (
                <tr key={e.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-2.5 text-white/70">{formatDateTime(e.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    {e.user ? (
                      <>
                        <p>
                          {e.user.firstName} {e.user.lastName}
                        </p>
                        <p className="text-xs text-white/45">{e.user.role?.name?.toLowerCase().replace(/_/g, " ")}</p>
                      </>
                    ) : (
                      <span className="text-white/45">System</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`font-mono text-xs ${/critical|override|mismatch|failed|unpaid/.test(e.action) ? "text-red-200" : ""}`}>{e.action}</span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-white/55">
                    {e.entity}
                    {e.entityId ? ` · …${e.entityId.slice(-6)}` : ""}
                  </td>
                  <td className="max-w-md break-words px-4 py-2.5 text-xs text-white/60">{shortDetails(e.details)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex gap-3 text-sm">
        {beforeDate && (
          <Link href={query({})} className="rounded-full border border-white/15 px-4 py-2 hover:bg-white/10">
            ← Newest
          </Link>
        )}
        {older && (
          <Link href={query({ before: older })} className="rounded-full border border-white/15 px-4 py-2 hover:bg-white/10">
            Older →
          </Link>
        )}
      </div>
    </div>
  );
}
