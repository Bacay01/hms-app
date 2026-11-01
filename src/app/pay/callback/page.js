import { Suspense } from "react";
import { settleOnlinePayment } from "@/lib/paystack";
import { formatNaira } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site";

// Public page: the gateway sends the patient's browser here after they pay (?reference=…)
export default function PaymentCallbackPage({ searchParams }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#0a0a0a] p-6 text-white">
      <Suspense fallback={<p className="text-white/60">Confirming your payment…</p>}>
        <Result searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Result({ searchParams }) {
  const { reference = "" } = await searchParams;
  let outcome = { ok: false, reason: "no_reference" };
  if (reference) {
    try {
      outcome = await settleOnlinePayment(String(reference));
    } catch {
      outcome = { ok: false, reason: "unreachable" };
    }
  }

  const receipt = outcome.paymentId
    ? await prisma.payment.findUnique({ where: { id: outcome.paymentId }, select: { receiptNumber: true, amountKobo: true } })
    : null;

  return (
    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
      <p className="text-lg font-semibold">{SITE.name}</p>
      {outcome.ok && receipt ? (
        <>
          <p className="mt-6 text-sm uppercase tracking-wider text-white/50">Payment received</p>
          <p className="mt-1 text-4xl font-bold">{formatNaira(receipt.amountKobo)}</p>
          <p className="mt-3 text-sm text-white/70">
            Receipt <span className="font-mono">{receipt.receiptNumber}</span>
          </p>
          <p className="mt-6 text-xs text-white/45">Thank you. You can collect a printed receipt at the cashier.</p>
        </>
      ) : (
        <>
          <p className="mt-6 text-sm uppercase tracking-wider text-white/50">Payment not confirmed yet</p>
          <p className="mt-3 text-sm text-white/70">
            {outcome.reason === "status_abandoned" || outcome.reason === "status_failed"
              ? "The payment did not go through. You can try the link again or pay at the cashier."
              : "We couldn't confirm the payment right now. If you were charged, show this reference at the cashier."}
          </p>
          {reference && <p className="mt-4 font-mono text-xs text-white/50">{String(reference)}</p>}
        </>
      )}
    </div>
  );
}
