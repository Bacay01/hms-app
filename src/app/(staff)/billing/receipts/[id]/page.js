import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatNaira } from "@/lib/money";
import { nairaInWords } from "@/lib/payments";
import { formatDateTime, fullName } from "@/lib/patients";
import { SITE } from "@/lib/site";
import PrintPageButton from "@/components/staff/PrintPageButton";

const METHOD_LABELS = { CASH: "Cash", POS: "POS", TRANSFER: "Bank transfer", PAYSTACK: "Paystack (online)" };

export default function ReceiptPage({ params }) {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading receipt…</p>}>
      <Receipt params={params} />
    </Suspense>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

async function Receipt({ params }) {
  await requirePermission("billing.read");
  const { id } = await params;

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      receivedBy: { select: { firstName: true, lastName: true } },
      bill: {
        select: {
          id: true,
          patient: { select: { firstName: true, lastName: true, otherNames: true, hospitalNumber: true } },
          encounter: { select: { startedAt: true } },
        },
      },
    },
  });
  if (!payment) notFound();

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/billing/${payment.bill.id}`} className="text-sm text-white/60 hover:text-white">
          ← Bill
        </Link>
        <PrintPageButton label="Print / Save as PDF" />
      </div>

      <article className="rounded-2xl bg-white p-8 text-sm text-neutral-900 print:rounded-none print:p-0">
        <p className="text-xl font-bold">{SITE.name}</p>
        <p className="text-xs text-neutral-500">{SITE.tagline}</p>

        <div className="mt-6 flex justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-neutral-500">Receipt</p>
            <p className="font-mono font-semibold">{payment.receiptNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-neutral-500">Date</p>
            <p>{formatDateTime(payment.createdAt)}</p>
          </div>
        </div>

        <dl className="mt-5 border-t border-neutral-200 pt-3">
          <Row label="Patient">{fullName(payment.bill.patient)}</Row>
          <Row label="Hospital no.">
            <span className="font-mono">{payment.bill.patient.hospitalNumber}</span>
          </Row>
          <Row label="Visit">{formatDateTime(payment.bill.encounter.startedAt)}</Row>
          <Row label="Paid by">
            {METHOD_LABELS[payment.method]}
            {payment.reference ? ` · ${payment.reference}` : ""}
          </Row>
          <Row label="Received by">
            {payment.receivedBy.firstName} {payment.receivedBy.lastName}
          </Row>
        </dl>

        <div className="mt-5 rounded-xl bg-neutral-100 p-4 print:border print:border-neutral-300">
          <p className="text-[11px] uppercase tracking-wider text-neutral-500">Amount paid</p>
          <p className="text-3xl font-bold">{formatNaira(payment.amountKobo)}</p>
          <p className="mt-1 text-xs italic text-neutral-600">{nairaInWords(payment.amountKobo)}</p>
        </div>

        <dl className="mt-4">
          <Row label="Bill total">{formatNaira(payment.billTotalKobo)}</Row>
          <Row label="Balance after this payment">{formatNaira(payment.balanceAfterKobo)}</Row>
        </dl>

        {payment.status === "REVERSED" && (
          <p className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-center font-semibold text-red-700">
            REVERSED — this payment was refunded
          </p>
        )}

        <p className="mt-6 border-t border-neutral-200 pt-3 text-center text-xs text-neutral-500">
          Thank you. Please keep this receipt for your records.
        </p>
      </article>
    </div>
  );
}
