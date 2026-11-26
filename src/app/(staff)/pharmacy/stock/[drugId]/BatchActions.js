"use client";

import { useActionState, useState } from "react";
import { adjustStock } from "../../adjust-actions";

const input =
  "rounded-lg border border-white/15 bg-black/30 px-2.5 py-1.5 text-xs text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none";
const button = "rounded-full border border-white/15 px-3 py-1 text-xs hover:bg-white/10 disabled:opacity-60";

const TYPES = [
  ["DAMAGED", "Damaged / broken (−)"],
  ["COUNT_DOWN", "Count: less than recorded (−)"],
  ["COUNT_UP", "Count: more than recorded (+)"],
  ["RETURN_TO_SUPPLIER", "Returned to supplier (−)"],
  ["EXPIRED", "Expired — write-off (−)"],
];

export default function BatchActions({ batch }) {
  const [open, setOpen] = useState(false);
  const [writeOffState, writeOff, writingOff] = useActionState(adjustStock, {});
  const [state, action, pending] = useActionState(adjustStock, {});
  const message = state?.error || writeOffState?.error;
  const success = state?.success || writeOffState?.success;

  return (
    <div className="space-y-1.5 text-right">
      <div className="flex justify-end gap-1.5">
        {batch.expired && batch.onHand > 0 && (
          <form action={writeOff}>
            <input type="hidden" name="batchId" value={batch.id} />
            <input type="hidden" name="type" value="EXPIRED" />
            <input type="hidden" name="quantity" value={batch.onHand} />
            <button
              disabled={writingOff}
              onClick={(e) => {
                if (!confirm(`Write off all ${batch.onHand} expired units of ${batch.batchNumber}? They must be destroyed or returned.`)) e.preventDefault();
              }}
              className="rounded-full bg-accent px-3 py-1 text-xs font-semibold hover:bg-accent-hover disabled:opacity-60"
            >
              {writingOff ? "…" : "Write off"}
            </button>
          </form>
        )}
        <button type="button" onClick={() => setOpen((v) => !v)} className={button}>
          {open ? "Close" : "Adjust"}
        </button>
      </div>

      {open && (
        <form action={action} className="flex flex-wrap justify-end gap-1.5">
          <input type="hidden" name="batchId" value={batch.id} />
          <select name="type" defaultValue="DAMAGED" className={input}>
            {TYPES.map(([value, label]) => (
              <option key={value} value={value} className="bg-neutral-900">
                {label}
              </option>
            ))}
          </select>
          <input name="quantity" type="number" min="1" placeholder="Qty" className={`${input} w-20`} />
          <input name="note" placeholder="Reason" className={`${input} w-40`} />
          <button disabled={pending} className={button}>
            {pending ? "…" : "Save"}
          </button>
        </form>
      )}

      {message && <p className="text-xs text-red-200">{message}</p>}
      {success && <p className="text-xs text-white/70">{success}</p>}
    </div>
  );
}
