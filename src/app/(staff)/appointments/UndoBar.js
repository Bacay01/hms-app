"use client";

import { useActionState } from "react";
import { undoLastAction } from "./actions";
import { ENCOUNTER_STATUS_LABELS } from "@/lib/queue";
import { fullName } from "@/lib/patients";

export default function UndoBar({ action }) {
  const [state, formAction, pending] = useActionState(undoLastAction, {});

  if (!action) {
    return state?.error ? <p className="mt-6 text-sm text-red-200">{state.error}</p> : null;
  }

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm">
      <p className="text-white/80">
        You moved{" "}
        <span className="font-semibold text-white">
          #{action.queueNumber} {fullName(action.patient)}
        </span>{" "}
        to <span className="font-semibold text-white">{ENCOUNTER_STATUS_LABELS[action.to]}</span>.
      </p>
      <form action={formAction}>
        <button
          disabled={pending}
          className="rounded-full border border-white/20 px-4 py-1.5 text-sm transition-colors hover:bg-white/10 disabled:opacity-60"
        >
          {pending ? "Undoing…" : "Undo"}
        </button>
      </form>
      {state?.error && <p className="w-full text-xs text-red-200">{state.error}</p>}
    </div>
  );
}
