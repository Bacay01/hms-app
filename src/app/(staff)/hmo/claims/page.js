import { Suspense } from "react";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { claimLines } from "@/lib/hmoClaims";
import { formatNaira } from "@/lib/money";
import { formatDate, formatDateTime, fullName } from "@/lib/patients";
import { localDate } from "@/lib/time";
import { submitClaim } from "../actions";
import { SubmitClaimForm } from "../HmoForms";

const MONTH_RE = /^\d{4}-\d{2}$/;

export default function ClaimsPage({ searchParams }) {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading claims…</p>}>
      <Claims searchParams={searchParams} />
    </Suspense>
  );
}

async function Claims({ searchParams }) {
  await requirePermission("hmo.manage");
  const { hmo: hmoParam = "", month: monthParam = "" } = await searchParams;
  const month = MONTH_RE.test(String(monthParam)) ? String(monthParam) : localDate().slice(0, 7);
  const hmos = await prisma.hmo.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  const hmoId = hmos.find((h) => h.id === hmoParam)?.id ?? hmos[0]?.id;

  const [{ bills, totalKobo }, claim] = hmoId
    ? await Promise.all([claimLines(hmoId, month), prisma.hmoClaim.findUnique({ where: { hmoId_month: { hmoId, month } }, include: {} })])
    : [{ bills: [], totalKobo: 0 }, null];

  return (
    <div className="max-w-6xl">
      <Link href="/hmo" className="text-sm text-white/60 hover:text-white">← HMO</Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Monthly claims</h1>

      <form className="mt-4 flex flex-wrap gap-2">
        <select name="hmo" defaultValue={hmoId} className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white">
          {hmos.map((h) => (
            <option key={h.id} value={h.id} className="bg-neutral-900">{h.name}</option>
          ))}
        </select>
        <input type="month" name="month" defaultValue={month} className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white [color-scheme:dark]" />
        <button className="rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/10">Show</button>
      </form>

      {!hmoId ? (
        <p className="mt-6 text-sm text-white/55">Add an HMO first.</p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/45">Claim total · {month}</p>
              <p className="mt-1 text-3xl font-bold">{formatNaira(totalKobo)}</p>
              <p className="text-xs text-white/50">{bills.length} visit(s)</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a href={`/hmo/claims/csv?hmo=${hmoId}&month=${month}`} className="rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/10">
                Download CSV
              </a>
              {claim ? (
                <span className="text-sm text-white/70">
                  Submitted {formatDateTime(claim.createdAt)} · {formatNaira(claim.totalKobo)}
                  {claim.totalKobo !== totalKobo && <span className="text-red-200"> (bills changed since)</span>}
                </span>
              ) : (
                bills.length > 0 && <SubmitClaimForm action={submitClaim.bind(null, hmoId, month)} totalKobo={totalKobo} billCount={bills.length} />
              )}
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {bills.map((b) => (
              <section key={b.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <p>
                    <span className="font-medium">{fullName(b.patient)}</span>{" "}
                    <span className="font-mono text-xs text-white/45">{b.patient.hospitalNumber}</span> · enrolment{" "}
                    <span className="font-mono">{b.enrolmentNo}</span>
                  </p>
                  <p className="text-white/60">{formatDate(b.encounter.startedAt)} · {b.hmoPlanName}</p>
                </div>
                <ul className="mt-2 space-y-0.5 text-xs">
                  {b.items.map((i) => (
                    <li key={i.id} className="flex justify-between gap-3">
                      <span className="text-white/70">
                        {i.description} × {i.quantity}
                        {i.preauthCode ? ` · PA ${i.preauthCode}` : ""}
                      </span>
                      <span>{formatNaira(i.hmoKobo)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 flex justify-between border-t border-white/10 pt-2 font-semibold">
                  <span>Visit total claimed</span>
                  <span>{formatNaira(b.hmoKobo)}</span>
                </p>
              </section>
            ))}
            {bills.length === 0 && <p className="text-sm text-white/55">No HMO-covered visits this month.</p>}
          </div>
        </>
      )}
    </div>
  );
}
