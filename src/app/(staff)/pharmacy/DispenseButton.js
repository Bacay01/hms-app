"use client";

import { useActionState } from "react";
import { dispensePrescription } from "./dispense-actions";

export default function DispenseButton({ rx }) {
  const [state, action, pending] = useActionState(dispensePrescription, {});
  const needsReason = rx.payment !== "PAID" && !rx.emergency;

  return (
    <div className="space-y-1.5">
      <form action={action} className="flex flex-wrap items-center justify-end gap-2">
        <input type="hidden" name="prescriptionId" value={rx.id} />
        {needsReason && (
          <input
            name="overrideReason"
            placeholder="Reason to dispense unpaid"
            className="w-52 rounded-lg border border-white/15 bg-black/30 px-3 py-1.5 text-xs text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none"
          />
        )}
        <button
          disabled={pending || !rx.enough}
          onClick={(e) => {
            if (!confirm(`Dispense ${rx.label}?`)) e.preventDefault();
          }}
          className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "Dispensing…" : "Dispense"}
        </button>
      </form>
      {state?.error && <p className="text-right text-xs text-red-200">{state.error}</p>}
      {state?.success && <p className="text-right text-xs text-white/70">{state.success}</p>}
    </div>
  );
}
