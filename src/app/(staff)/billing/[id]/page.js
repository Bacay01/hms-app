import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/nav";
import { syncEncounterBill } from "@/lib/billing";
import { formatNaira } from "@/lib/money";
import { formatDateTime, fullName } from "@/lib/patients";
import { recordPayment } from "../payment-actions";
import PaymentForm from "./PaymentForm";
import OnlinePaymentPanel from "./OnlinePaymentPanel";

const METHOD_LABELS = { CASH: "Cash", POS: "POS", TRANSFER: "Transfer", PAYSTACK: "Paystack" };

export default function BillPage({ params }) {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading bill…</p>}>
      <BillDetail params={params} />
    </Suspense>
  );
}

async function BillDetail({ params }) {
  const session = await requirePermission("billing.read");
  const { id } = await params;

  const found = await prisma.bill.findUnique({ where: { id }, select: { encounterId: true } });
  if (!found) notFound();
  await syncEncounterBill(found.encounterId); // always show the bill as it should be right now

  const bill = await prisma.bill.findUnique({
    where: { id },
    include: {
      patient: { select: { firstName: true, lastName: true, otherNames: true, hospitalNumber: true, phone: true } },
      encounter: { select: { startedAt: true, doctor: { select: { lastName: true } } } },
      items: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "asc" }, include: { receivedBy: { select: { firstName: true, lastName: true } } } },
    },
  });

  const balance = bill.totalKobo - bill.paidKobo;
  const unpriced = bill.items.filter((i) => i.status === "ACTIVE" && i.priceMissing).length;
  const canPay = can(session.permissions, "billing.payments");

  return (
    <div className="max-w-4xl">
      <Link href="/billing" className="text-sm text-white/60 hover:text-white">← Billing</Link>

      <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h1 className="text-2xl font-bold tracking-tight">{fullName(bill.patient)}</h1>
        <p className="mt-1 text-sm text-white/60">
          <span className="font-mono">{bill.patient.hospitalNumber}</span> · {bill.patient.phone ?? "No phone"} · Visit{" "}
          {formatDateTime(bill.encounter.startedAt)}
          {bill.encounter.doctor ? ` · Dr ${bill.encounter.doctor.lastName}` : ""}
        </p>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wider text-white/45">
            <tr>
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="px-4 py-3 text-right font-medium">Qty × Price</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {bill.items.map((i) => {
              const voided = i.status === "VOIDED";
              return (
                <tr key={i.id} className={voided ? "text-white/35" : ""}>
                  <td className="px-4 py-3">
                    <p className={voided ? "line-through" : "font-medium"}>{i.description}</p>
                    <p className="text-xs text-white/40">{i.category.charAt(0) + i.category.slice(1).toLowerCase()}</p>
                    {voided && <p className="text-xs">Voided: {i.voidReason}</p>}
                    {!voided && i.priceMissing && <p className="text-xs text-red-200">No price set — ask the Admin to price {i.serviceCode}</p>}
                  </td>
                  <td className="px-4 py-3 text-right text-white/70">
                    {i.quantity} × {formatNaira(i.unitPriceKobo)}
                  </td>
                  <td className={`px-4 py-3 text-right ${voided ? "line-through" : ""}`}>{formatNaira(i.amountKobo)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 ml-auto max-w-xs space-y-1.5 text-sm">
        <div className="flex justify-between text-white/70">
          <span>Total</span>
          <span>{formatNaira(bill.totalKobo)}</span>
        </div>
        <div className="flex justify-between text-white/70">
          <span>Paid</span>
          <span>{formatNaira(bill.paidKobo)}</span>
        </div>
        <div className="flex justify-between border-t border-white/10 pt-1.5 text-lg font-bold">
          <span>{balance < 0 ? "Credit" : "Balance"}</span>
          <span>{formatNaira(Math.abs(balance))}</span>
        </div>
        {balance < 0 && <p className="text-xs text-red-200">Paid more than the bill now totals — refund needed (5D).</p>}
      </div>

      {canPay && (
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-sm font-semibold">Record payment</h2>
          <div className="mt-4">
            <PaymentForm
              action={recordPayment.bind(null, bill.id)}
              balanceKobo={balance}
              blockedReason={unpriced > 0 ? `${unpriced} item(s) have no price yet — ask the Admin to price them before taking payment.` : null}
            />
          </div>
        </section>
      )}

      {canPay && unpriced === 0 && <OnlinePaymentPanel billId={bill.id} balanceKobo={balance} />}


      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-sm font-semibold">Payments</h2>
        {bill.payments.length === 0 ? (
          <p className="mt-3 text-sm text-white/55">No payments yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-white/5 text-sm">
            {bill.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div>
                  <Link href={`/billing/receipts/${p.id}`} className="font-mono font-medium underline">
                    {p.receiptNumber}
                  </Link>
                  <p className="text-xs text-white/50">
                    {formatDateTime(p.createdAt)} · {METHOD_LABELS[p.method]}
                    {p.reference ? ` (${p.reference})` : ""} · {p.receivedBy.firstName} {p.receivedBy.lastName}
                  </p>
                </div>
                <span className="font-semibold">{formatNaira(p.amountKobo)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
