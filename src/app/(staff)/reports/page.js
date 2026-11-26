import { Suspense } from "react";
import { requirePermission } from "@/lib/auth";
import { formatNaira } from "@/lib/money";
import { units } from "@/lib/prescribing";
import { loadReport, parseRange } from "@/lib/reports";
import { localDate } from "@/lib/time";

export default function ReportsPage({ searchParams }) {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Building reports…</p>}>
      <Reports searchParams={searchParams} />
    </Suspense>
  );
}

function Card({ title, csv, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {csv && (
          <a href={csv} className="rounded-full border border-white/15 px-3 py-1 text-xs hover:bg-white/10">
            CSV
          </a>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

async function Reports({ searchParams }) {
  await requirePermission("reports.read");
  const params = await searchParams;
  const today = localDate();
  const { from, to, windowStart } = parseRange(String(params.from ?? ""), String(params.to ?? ""), today);
  const r = await loadReport({ from, to, today, windowStart });
  const csv = (type) => `/reports/csv?type=${type}&from=${from}&to=${to}`;
  const maxDay = Math.max(1, ...r.daily.map((d) => d.cashKobo));

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="mt-1 text-sm text-white/60">
            {from} → {to}. Cash = payments received minus refunds. HMO = amounts billed to HMOs.
          </p>
        </div>
        <form className="flex flex-wrap items-center gap-2">
          <input type="date" name="from" defaultValue={from} min={windowStart} max={today} className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white [color-scheme:dark]" />
          <span className="text-white/40">→</span>
          <input type="date" name="to" defaultValue={to} min={windowStart} max={today} className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white [color-scheme:dark]" />
          <button className="rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/10">Show</button>
        </form>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-5">
        {[
          ["Today", r.kpis.today],
          ["Last 7 days", r.kpis.last7],
          ["This month", r.kpis.thisMonth],
          ["Selected range", r.kpis.range],
          ["HMO billed (range)", r.kpis.hmoRange],
        ].map(([label, kobo]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-wider text-white/45">{label}</p>
            <p className="mt-1 text-xl font-bold">{formatNaira(kobo)}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Card title="Cash collected per day" csv={csv("daily")}>
          {r.daily.length > 62 ? (
            <p className="text-sm text-white/55">Choose a range of 2 months or less to see daily bars — or download the CSV.</p>
          ) : (
            <div className="flex h-40 items-end gap-1">
              {r.daily.map((d) => (
                <div key={d.date} className="group relative flex-1" title={`${d.date}: ${formatNaira(d.cashKobo)}`}>
                  <div className="rounded-t bg-accent/80" style={{ height: `${Math.max(2, Math.round((Math.max(0, d.cashKobo) / maxDay) * 150))}px` }} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Last 12 months" csv={csv("monthly")}>
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-white/45">
              <tr>
                <th className="py-1.5 font-medium">Month</th>
                <th className="py-1.5 text-right font-medium">Cash</th>
                <th className="py-1.5 text-right font-medium">HMO billed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {r.months.map((m) => (
                <tr key={m.month}>
                  <td className="py-1.5">{m.month}</td>
                  <td className="py-1.5 text-right">{formatNaira(m.cashKobo)}</td>
                  <td className="py-1.5 text-right text-white/70">{formatNaira(m.hmoKobo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Visits by department" csv={csv("departments")}>
          {r.departments.length === 0 ? (
            <p className="text-sm text-white/55">No visits in this range.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-white/45">
                <tr>
                  <th className="py-1.5 font-medium">Department</th>
                  <th className="py-1.5 text-right font-medium">Visits</th>
                  <th className="py-1.5 text-right font-medium">Patients</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {r.departments.map((d) => (
                  <tr key={d.name}>
                    <td className="py-1.5">{d.name}</td>
                    <td className="py-1.5 text-right">{d.visits}</td>
                    <td className="py-1.5 text-right text-white/70">{d.patients}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Top 10 diagnoses" csv={csv("diagnoses")}>
          {r.topDiagnoses.length === 0 ? (
            <p className="text-sm text-white/55">No diagnoses in this range.</p>
          ) : (
            <ol className="space-y-1.5 text-sm">
              {r.topDiagnoses.map((d, i) => (
                <li key={d.code ?? d.name} className="flex justify-between gap-3">
                  <span>
                    {i + 1}. {d.name} {d.code && <span className="font-mono text-xs text-white/45">{d.code}</span>}
                  </span>
                  <span className="font-semibold">{d.count}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card title="Drugs" csv={csv("drugs")}>
          <p className="text-sm">
            Stock value at cost: <span className="font-semibold">{formatNaira(r.drugs.stockValueKobo)}</span>
            {r.drugs.uncosted > 0 && <span className="text-xs text-red-200"> · {r.drugs.uncosted} batch(es) have no cost recorded</span>}
          </p>
          <p className="mt-3 text-xs uppercase tracking-wider text-white/45">Most dispensed in range</p>
          {r.drugs.top.length === 0 ? (
            <p className="mt-1 text-sm text-white/55">Nothing dispensed in this range.</p>
          ) : (
            <ol className="mt-1 space-y-1.5 text-sm">
              {r.drugs.top.map((d, i) => (
                <li key={d.drugId} className="flex justify-between gap-3">
                  <span>
                    {i + 1}. {d.name}
                  </span>
                  <span className="font-semibold">{units(d.quantity, d.unit)}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
