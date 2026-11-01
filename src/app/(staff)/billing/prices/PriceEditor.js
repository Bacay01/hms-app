"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { addService, loadDefaultPrices, updatePrice } from "../actions";

const input =
  "w-full rounded-lg border border-white/15 bg-black/30 px-3 py-1.5 text-sm text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none";

function submitWith(formAction) {
  return (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  };
}

export function LoadDefaultsButton() {
  const [state, action, pending] = useActionState(loadDefaultPrices, {});
  return (
    <form action={action} className="flex items-center gap-3">
      <button
        disabled={pending}
        className="rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
      >
        {pending ? "Loading…" : "Load default price list"}
      </button>
      {state?.success && <span className="text-sm text-white/70">{state.success}</span>}
    </form>
  );
}

export function PriceRow({ price }) {
  const [state, action, pending] = useActionState(updatePrice, {});
  return (
    <form onSubmit={submitWith(action)} className="grid grid-cols-[1fr_150px_80px_70px] items-center gap-3 py-2.5 text-sm">
      <input type="hidden" name="code" value={price.code} />
      <div>
        <p className={price.isActive ? "" : "text-white/40 line-through"}>{price.name}</p>
        <p className="font-mono text-[11px] text-white/40">
          {price.code} · per {price.unit}
        </p>
        {state?.error && <p className="text-xs text-red-200">{state.error}</p>}
        {state?.success && <p className="text-xs text-white/60">{state.success}</p>}
      </div>
      <label className="flex items-center gap-1.5">
        <span className="text-white/50">₦</span>
        <input name="price" defaultValue={(price.priceKobo / 100).toFixed(2)} inputMode="decimal" className={input} />
      </label>
      <label className="flex items-center gap-1.5 text-xs text-white/60">
        <input type="checkbox" name="isActive" defaultChecked={price.isActive} className="size-4 accent-[#e5262a]" />
        Active
      </label>
      <button
        disabled={pending}
        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs hover:bg-white/10 disabled:opacity-60"
      >
        {pending ? "…" : "Save"}
      </button>
    </form>
  );
}

export function AddServiceForm() {
  const [state, action, pending] = useActionState(addService, {});
  const formRef = useRef(null);

  useEffect(() => {
    if (state?.savedAt) formRef.current?.reset();
  }, [state?.savedAt]);

  return (
    <form ref={formRef} onSubmit={submitWith(action)} className="grid gap-3 sm:grid-cols-[1fr_1.4fr_1fr_0.8fr_0.9fr_auto] sm:items-end">
      <input name="code" placeholder="Code e.g. PROC-DRESSING" className={input} />
      <input name="name" placeholder="Name e.g. Wound dressing" className={input} />
      <select name="category" defaultValue="PROCEDURE" className={input}>
        {["PROCEDURE", "CONSULTATION", "LAB", "DRUG", "BED", "OTHER"].map((c) => (
          <option key={c} value={c} className="bg-neutral-900">
            {c.charAt(0) + c.slice(1).toLowerCase()}
          </option>
        ))}
      </select>
      <input name="unit" placeholder="Unit e.g. session" className={input} />
      <input name="price" placeholder="Price ₦" inputMode="decimal" className={input} />
      <button
        disabled={pending}
        className="rounded-full bg-accent px-4 py-2 text-sm font-semibold hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add"}
      </button>
      {state?.error && <p className="text-sm text-red-200 sm:col-span-6">{state.error}</p>}
      {state?.success && <p className="text-sm text-white/70 sm:col-span-6">{state.success}</p>}
    </form>
  );
}
