"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { decideAdjustment } from "../adjustment-actions";
import { formatNaira } from "@/lib/money";

const input =
  "w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none";

export function AdjustmentForm({ action, outstandingKobo, creditKobo }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [type, setType] = useState(creditKobo > 0 ? "REFUND" : "DISCOUNT");
  const formRef = useRef(null);

  useEffect(() => {
    if (state?.savedAt) formRef.current?.reset();
  }, [state?.savedAt]);

  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const limit = type === "DISCOUNT" ? outstandingKobo : creditKobo;

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        {[
          { value: "DISCOUNT", label: "Discount" },
          { value: "REFUND", label: "Refund" },
        ].map((t) => (
          <label
            key={t.value}
            className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm ${
              type === t.value ? "border-accent bg-accent/20 text-white" : "border-white/15 text-white/70 hover:bg-white/5"
            }`}
          >
            <input type="radio" name="type" value={t.value} checked={type === t.value} onChange={() => setType(t.value)} className="sr-only" />
            {t.label}
          </label>
        ))}
      </div>

      <p className="text-xs text-white/50">
        {type === "DISCOUNT"
          ? `Up to ${formatNaira(Math.max(0, limit))} (what is still owed).`
          : limit > 0
            ? `Up to ${formatNaira(limit)} (the credit on this bill).`
            : "No credit on this bill. Cancel the unused order first so the bill shows a credit."}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <input name="amount" inputMode="decimal" placeholder="Amount ₦" className={input} />
        <input name="reason" placeholder="Reason, e.g. staff family / test not done" className={input} />
      </div>

      {type === "REFUND" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <select name="refundMethod" defaultValue="CASH" className={input}>
            <option value="CASH" className="bg-neutral-900">Refund in cash</option>
            <option value="TRANSFER" className="bg-neutral-900">Refund by transfer</option>
          </select>
          <input name="refundReference" placeholder="Transfer reference (if any)" className={input} />
        </div>
      )}

      {state?.error && <p className="text-sm text-red-200">{state.error}</p>}
      {state?.success && <p className="text-sm text-white/75">{state.success}</p>}

      <button disabled={pending} className="rounded-full border border-white/15 px-5 py-2 text-sm hover:bg-white/10 disabled:opacity-60">
        {pending ? "Sending…" : "Request approval"}
      </button>
    </form>
  );
}

export function DecisionButtons({ adjustmentId }) {
  const [state, formAction, pending] = useActionState(decideAdjustment, {});

  function handleSubmit(event) {
    event.preventDefault();
    const submitter = event.nativeEvent.submitter;
    if (submitter?.value === "APPROVE" && !confirm("Approve this request? It will be applied to the bill straight away.")) return;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-wrap items-center gap-2">
      <input type="hidden" name="adjustmentId" value={adjustmentId} />
      <input name="note" placeholder="Note (required to reject)" className={`${input} max-w-xs py-1.5`} />
      <button name="decision" value="APPROVE" disabled={pending} className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold hover:bg-accent-hover disabled:opacity-60">
        Approve
      </button>
      <button name="decision" value="REJECT" disabled={pending} className="rounded-full border border-white/15 px-4 py-1.5 text-xs hover:bg-white/10 disabled:opacity-60">
        Reject
      </button>
      {state?.error && <p className="w-full text-xs text-red-200">{state.error}</p>}
      {state?.success && <p className="w-full text-xs text-white/70">{state.success}</p>}
    </form>
  );
}
