import { Suspense } from "react";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/nav";
import { summarisePayments } from "@/lib/cashReport";
import { formatNaira } from "@/lib/money";
import { formatDateTime, fullName } from "@/lib/patients";
import { dayRange, localDate } from "@/lib/time";
import PrintPageButton from "@/components/staff/PrintPageButton";
import CashCount from "./CashCount";

const METHOD_LABELS = { CASH: "Cash", POS: "POS", TRANSFER: "Transfer", PAYSTACK: "Online" };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function DailyReportPage({ searchParams }) {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading report…</p>}>
      <DailyReport searchParams={searchParams} />
    </Suspense>
  );
}

async function DailyReport({ searchParams }) {
  const session = await requirePermission("billing.read");
  const { date: requested = "" } = await searchParams;
  const date = DATE_RE.test(String(requested)) ? String(requested) : localDate();
  const seeAll = can(session.permissions, "billing.refunds.approve"); // cashiers see only their own takings

  const { start, end } = dayRange(date);
  const payments = await prisma.payment.findMany({
    where: { createdAt: { gte: start, lt: end }, ...(seeAll ? {} : { receivedById: session.userId }) },
    orderBy: { createdAt: "asc" },
    include: {
      receivedBy: { select: { firstName: true, lastName: true } },
      bill: { select: { id: true, patient: { select: { firstName: true, lastName: true, otherNames: true, hospitalNumber: true } } } },
    },
  });

  const summary = summarisePayments(
    payments.map((p) => ({
      receivedById: p.receivedById,
      receivedByName: `${p.receivedBy.firstName} ${p.receivedBy.lastName}`,
      method: p.method,
      amountKobo: p.amountKobo,
    }))
  );

  return (
    <div className="max-w-5xl">
      <div className="print:hidden">
        <Link href="/billing" className="text-sm text-white/60 hover:text-white">← Billing</Link>
      </div>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">End-of-day report</h1>
          <p className="mt-1 text-sm text-white/60">
            {date}
            {seeAll ? " · all cashiers" : " · your takings"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <form className="flex gap-2">
            <input
              type="date"
              name="date"
              defaultValue={date}
              className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white [color-scheme:dark]"
            />
            <button className="rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/10">Show</button>
          </form>
          <PrintPageButton />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          ["Received", summary.totalReceivedKobo],
          ["Refunded", summary.totalRefundedKobo],
          ["Net", summary.netKobo],
        ].map(([label, kobo]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs uppercase tracking-wider text-white/45">{label}</p>
            <p className="mt-1 text-2xl font-bold">{formatNaira(kobo)}</p>
          </div>
        ))}
      </div>

      {summary.cashiers.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-sm text-white/60">
          No payments on this day.
        </div>
      ) : (
        summary.cashiers.map((c) => (
          <section key={c.id} className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-sm font-semibold">{c.name}</h2>
            <table className="mt-3 w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-white/45">
                <tr>
                  <th className="py-2 font-medium">Method</th>
                  <th className="py-2 text-right font-medium">Count</th>
                  <th className="py-2 text-right font-medium">Received</th>
                  <th className="py-2 text-right font-medium">Refunded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {Object.entries(c.methods).map(([method, m]) => (
                  <tr key={method}>
                    <td className="py-2">{METHOD_LABELS[method] ?? method}</td>
                    <td className="py-2 text-right text-white/70">{m.count}</td>
                    <td className="py-2 text-right">{formatNaira(m.receivedKobo)}</td>
                    <td className="py-2 text-right text-white/70">{m.refundedKobo ? formatNaira(m.refundedKobo) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-white/10 pt-3 text-sm">
              <span>
                Net <span className="font-semibold">{formatNaira(c.netKobo)}</span>
              </span>
              <span>
                Cash in drawer should be <span className="font-bold">{formatNaira(c.cashInDrawerKobo)}</span>
              </span>
            </div>
            <CashCount expectedKobo={c.cashInDrawerKobo} />
          </section>
        ))
      )}

      {payments.length > 0 && (
        <section className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wider text-white/45">
              <tr>
                <th className="px-4 py-3 font-medium">Receipt</th>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Patient</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2.5 font-mono text-xs">
                    <Link href={`/billing/receipts/${p.id}`} className="underline">
                      {p.receiptNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-white/70">{formatDateTime(p.createdAt)}</td>
                  <td className="px-4 py-2.5">{fullName(p.bill.patient)}</td>
                  <td className="px-4 py-2.5 text-white/70">
                    {METHOD_LABELS[p.method]}
                    {p.reference ? ` · ${p.reference}` : ""}
                  </td>
                  <td className={`px-4 py-2.5 text-right ${p.amountKobo < 0 ? "text-red-200" : ""}`}>{formatNaira(p.amountKobo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
