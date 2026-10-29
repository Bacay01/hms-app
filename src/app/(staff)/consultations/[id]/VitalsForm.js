"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { VITAL_FIELDS } from "@/lib/vitals";

const input =
  "w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none";

export default function VitalsForm({ action }) {
  const [state, formAction, pending] = useActionState(action, {});
  const formRef = useRef(null);

  // Clear the form after a successful save
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {VITAL_FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="mb-1 block text-[11px] font-medium text-white/65">
              {f.label} <span className="text-white/40">({f.unit})</span>
            </span>
            <input
              name={f.key}
              type="number"
              inputMode="decimal"
              step={f.int ? 1 : 0.1}
              min={f.min}
              max={f.max}
              className={input}
            />
          </label>
        ))}
      </div>
      <label className="block">
        <span className="mb-1 block text-[11px] font-medium text-white/65">Notes (optional)</span>
        <input name="notes" placeholder="e.g. Patient anxious, reading repeated" className={input} />
      </label>

      {state?.error && (
        <p role="alert" className="rounded-xl border border-accent/40 bg-accent/15 px-4 py-2.5 text-sm text-red-100">
          {state.error}
        </p>
      )}
      {state?.success && <p className="text-sm text-white/75">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Saving…" : "Record vitals"}
      </button>
    </form>
  );
}
