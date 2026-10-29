"use client";

import { useActionState } from "react";
import { closeDay } from "./manage-actions";

export default function CloseDayButton() {
  const [state, action, pending] = useActionState(closeDay, {});

  return (
    <div className="flex flex-col items-start gap-1 sm:ml-auto sm:items-end">
      <form action={action}>
        <button
          disabled={pending}
          onClick={(e) => {
            if (
              !confirm(
                "Close the day?\n\nPatients still waiting will be marked as left without being seen, and missed appointments as no-shows. Patients with a nurse or doctor are not affected."
              )
            ) {
              e.preventDefault();
            }
          }}
          className="rounded-full border border-accent/40 px-4 py-1.5 text-sm text-red-200 transition-colors hover:bg-accent/15 disabled:opacity-60"
        >
          {pending ? "Closing…" : "Close day"}
        </button>
      </form>
      {state?.success && <p className="text-xs text-white/70">{state.success}</p>}
    </div>
  );
}
