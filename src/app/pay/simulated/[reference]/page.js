import { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatNaira } from "@/lib/money";
import { simulateCharge } from "./actions";

export default function SimulatedCheckoutPage({ params }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#0a0a0a] p-6 text-white">
      <Suspense fallback={<p className="text-white/60">Loading…</p>}>
        <Checkout params={params} />
      </Suspense>
    </main>
  );
}

async function Checkout({ params }) {
  if (process.env.PAYMENT_GATEWAY !== "simulated") notFound();
  const { reference } = await params;
  const charge = await prisma.simulatedGatewayCharge.findUnique({ where: { reference: decodeURIComponent(reference) } });
  if (!charge) notFound();

  const button = "w-full rounded-full py-3 text-sm font-semibold transition-colors";

  return (
    <div className="w-full max-w-sm rounded-2xl border-2 border-dashed border-amber-400/60 bg-white/[0.04] p-8">
      <p className="rounded-full bg-amber-400/15 px-3 py-1 text-center text-[11px] font-semibold uppercase tracking-wider text-amber-200">
        Simulated payment gateway · testing only · no real money
      </p>

      <p className="mt-6 text-center text-sm text-white/50">Amount</p>
      <p className="text-center text-4xl font-bold">{formatNaira(charge.amountKobo)}</p>
      <p className="mt-2 text-center font-mono text-xs text-white/45">{charge.reference}</p>

      {charge.status !== "pending" ? (
        <p className="mt-8 text-center text-sm text-white/70">This charge is already {charge.status}.</p>
      ) : (
        <form action={simulateCharge} className="mt-8 space-y-3">
          <input type="hidden" name="reference" value={charge.reference} />
          <button name="outcome" value="success" className={`${button} bg-accent hover:bg-accent-hover`}>
            Pay {formatNaira(charge.amountKobo)}
          </button>
          <button name="outcome" value="tampered" className={`${button} border border-white/15 hover:bg-white/10`}>
            Pay ₦1 less (tampering test)
          </button>
          <button name="outcome" value="failed" className={`${button} border border-white/15 text-white/70 hover:bg-white/10`}>
            Decline
          </button>
          <label className="flex items-center gap-2 pt-2 text-xs text-white/55">
            <input type="checkbox" name="skipWebhook" className="size-4 accent-[#e5262a]" />
            Don&apos;t send the webhook (test the callback and &quot;Check status&quot; path)
          </label>
        </form>
      )}
    </div>
  );
}
