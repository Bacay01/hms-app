import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatNaira } from "@/lib/money";
import { formatDateTime, fullName } from "@/lib/patients";

// Find ANY bill — paid, outstanding, fully HMO-covered or in credit — by name, hospital number or phone
export default function BillSearch({ searchParams }) {
  return (
    <Suspense fallback={null}>
      <Search searchParams={searchParams} />
    </Suspense>
  );
}

function statusOf(b) {
  const balance = b.totalKobo - b.paidKobo;
  if (balance < 0) return { label: "Credit", style: "border border-accent/60 text-red-200" };
  if (balance > 0) return { label: "Outstanding", style: "border border-accent/60 text-red-200" };
  if (b.hmoKobo > 0 && b.totalKobo === 0) return { label: "HMO covered", style: "bg-white/15 text-white" };
  return { label: "Paid", style: "bg-white/15 text-white" };
}

async function Search({ searchParams }) {
  const { q = "" } = await searchParams;
  const query = String(q).trim();
  const terms = query.split(/\s+/).filter(Boolean).slice(0, 4);

  const bills = terms.length
    ? await prisma.bill.findMany({
        where: {
          AND: terms.map((t) => ({
            patient: {
              OR: [
                { hospitalNumber: { contains: t, mode: "insensitive" } },
                { firstName: { contains: t, mode: "insensitive" } },
                { lastName: { contains: t, mode: "insensitive" } },
                { otherNames: { contains: t, mode: "insensitive" } },
                { phone: { contains: t } },
              ],
            },
          })),
        },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          patient: { select: { firstName: true, lastName: true, otherNames: true, hospitalNumber: true } },
          encounter: { select: { startedAt: true } },
        },
      })
    : [];

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <h2 className="text-sm font-semibold">Find a bill</h2>
      <form className="mt-3 flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Name, hospital number or phone — finds paid and HMO-covered bills too"
          className="w-full max-w-lg rounded-full border border-white/15 bg-black/30 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
        />
        <button className="rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/10">Search</button>
        {query && (
          <Link href="/billing" className="self-center text-sm text-white/60 hover:text-white">
            Clear
          </Link>
        )}
      </form>

      {query && bills.length === 0 && <p className="mt-4 text-sm text-white/55">No bills for “{query}”.</p>}

      {bills.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-white/45">
              <tr>
                <th className="py-2 pr-3 font-medium">Patient</th>
                <th className="py-2 pr-3 font-medium">Visit</th>
                <th className="py-2 pr-3 text-right font-medium">Gross</th>
                <th className="py-2 pr-3 text-right font-medium">HMO</th>
                <th className="py-2 pr-3 text-right font-medium">Patient</th>
                <th className="py-2 pr-3 text-right font-medium">Paid</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {bills.map((b) => {
                const s = statusOf(b);
                return (
                  <tr key={b.id}>
                    <td className="py-2.5 pr-3">
                      <p className="font-medium">{fullName(b.patient)}</p>
                      <p className="font-mono text-xs text-white/45">{b.patient.hospitalNumber}</p>
                    </td>
                    <td className="py-2.5 pr-3 text-white/70">{formatDateTime(b.encounter.startedAt)}</td>
                    <td className="py-2.5 pr-3 text-right text-white/70">{formatNaira(b.grossKobo || b.totalKobo)}</td>
                    <td className="py-2.5 pr-3 text-right text-white/70">{b.hmoKobo ? formatNaira(b.hmoKobo) : "—"}</td>
                    <td className="py-2.5 pr-3 text-right">{formatNaira(b.totalKobo)}</td>
                    <td className="py-2.5 pr-3 text-right text-white/70">{formatNaira(b.paidKobo)}</td>
                    <td className="py-2.5 pr-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${s.style}`}>{s.label}</span>
                    </td>
                    <td className="py-2.5 text-right">
                      <Link href={`/billing/${b.id}`} className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold hover:bg-accent-hover">
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-white/40">Figures are as of each bill&apos;s last update — opening a bill brings it fully up to date.</p>
        </div>
      )}
    </section>
  );
}
