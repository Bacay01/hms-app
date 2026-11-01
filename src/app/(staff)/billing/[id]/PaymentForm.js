"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useState } from "react";
import { formatNaira, nairaToKobo } from "@/lib/money";

const METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "POS", label: "POS" },
  { value: "TRANSFER", label: "Transfer" },
];
const input =
  "w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none";

export default function PaymentForm({ action, balanceKobo, blockedReason }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [method, setMethod] = useState("CASH");
  const [amount, setAmount] = useState((balanceKobo / 100).toFixed(2));
  const [tendered, setTendered] = useState("");

  // After a payment the balance changes — start the next payment from the new balance
  useEffect(() => {
    setAmount((balanceKobo / 100).toFixed(2));
    setTendered("");
  }, [balanceKobo]);

  const amountKobo = nairaToKobo(amount);
  const tenderedKobo = nairaToKobo(tendered);
  const change =
    method === "CASH" && amountKobo !== null && tenderedKobo !== null && tenderedKobo >= amountKobo
      ? tenderedKobo - amountKobo
      : null;

  function handleSubmit(event) {
    event.preventDefault();
    if (!amountKobo) return;
    if (!confirm(`Record ${formatNaira(amountKobo)} by ${method.toLowerCase()}?`)) return;
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <div>
      {state?.success && (
        <div className="mb-4 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm">
          {state.success}
          <Link href={`/billing/receipts/${state.receiptId}`} className="ml-2 font-semibold underline">
            Print receipt
          </Link>
        </div>
      )}

      {balanceKobo <= 0 ? (
        <p className="text-sm text-white/70">This bill is fully paid.</p>
      ) : blockedReason ? (
        <p className="text-sm text-red-200">{blockedReason}</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            {METHODS.map((m) => (
              <label
                key={m.value}
                className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm ${
                  method === m.value ? "border-accent bg-accent/20 text-white" : "border-white/15 text-white/70 hover:bg-white/5"
                }`}
              >
                <input
                  type="radio"
                  name="method"
                  value={m.value}
                  checked={method === m.value}
                  onChange={() => setMethod(m.value)}
                  className="sr-only"
                />
                {m.label}
              </label>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs text-white/60">Amount (₦)</span>
              <div className="flex gap-2">
                <input name="amount" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className={input} />
                <button
                  type="button"
                  onClick={() => setAmount((balanceKobo / 100).toFixed(2))}
                  className="shrink-0 rounded-xl border border-white/15 px-3 text-xs hover:bg-white/10"
                >
                  Full balance
                </button>
              </div>
            </label>

            {method === "CASH" ? (
              <label className="block">
                <span className="mb-1 block text-xs text-white/60">Cash handed over (optional)</span>
                <input value={tendered} onChange={(e) => setTendered(e.target.value)} inputMode="decimal" placeholder="e.g. 10000" className={input} />
                {change !== null && (
                  <span className="mt-1 block text-sm text-white/80">
                    Change to give: <span className="font-semibold text-white">{formatNaira(change)}</span>
                  </span>
                )}
              </label>
            ) : (
              <label className="block">
                <span className="mb-1 block text-xs text-white/60">{method === "POS" ? "POS slip reference" : "Transfer reference"}</span>
                <input name="reference" required placeholder={method === "POS" ? "e.g. 004512" : "e.g. FT2611010042"} className={input} />
              </label>
            )}
          </div>

          {state?.error && (
            <p role="alert" className="rounded-xl border border-accent/40 bg-accent/15 px-3 py-2 text-sm text-red-100">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending || !amountKobo}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold hover:bg-accent-hover disabled:opacity-50"
          >
            {pending ? "Recording…" : `Record ${amountKobo ? formatNaira(amountKobo) : "payment"}`}
          </button>
        </form>
      )}
    </div>
  );
}
