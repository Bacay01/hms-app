"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { receiveStock } from "../stock-actions";
import { DRUGS } from "@/lib/drugs";

const input =
  "w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-white/70">{label}</span>
      {children}
    </label>
  );
}

export default function ReceiveForm({ defaultDrugId, today }) {
  const [state, formAction, pending] = useActionState(receiveStock, {});
  const formRef = useRef(null);

  useEffect(() => {
    if (state?.savedAt) formRef.current?.reset();
  }, [state?.savedAt]);

  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <Field label="Drug">
        <select name="drugId" defaultValue={defaultDrugId ?? ""} required className={input}>
          <option value="" disabled className="bg-neutral-900">Choose a drug…</option>
          {[...DRUGS].sort((a, b) => a.name.localeCompare(b.name)).map((d) => (
            <option key={d.id} value={d.id} className="bg-neutral-900">
              {d.name} (per {d.unit})
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Batch number (as printed on the pack)">
          <input name="batchNumber" required placeholder="e.g. EMZ2611" className={input} />
        </Field>
        <Field label="Expiry date">
          <input name="expiryDate" type="date" required min={today} className={`${input} [color-scheme:dark]`} />
        </Field>
        <Field label="Quantity (units: tablets, capsules or sachets)">
          <input name="quantity" type="number" min="1" required placeholder="e.g. 500" className={input} />
        </Field>
        <Field label="Cost per unit ₦ (optional)">
          <input name="cost" inputMode="decimal" placeholder="e.g. 12.50" className={input} />
        </Field>
      </div>

      <Field label="Supplier (optional)">
        <input name="supplier" placeholder="e.g. Emzor Pharmaceuticals" className={input} />
      </Field>

      {state?.error && (
        <p role="alert" className="rounded-xl border border-accent/40 bg-accent/15 px-4 py-2.5 text-sm text-red-100">
          {state.error}
        </p>
      )}
      {state?.success && <p className="text-sm text-white/80">{state.success}</p>}

      <button disabled={pending} className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold hover:bg-accent-hover disabled:opacity-60">
        {pending ? "Receiving…" : "Receive into stock"}
      </button>
    </form>
  );
}
