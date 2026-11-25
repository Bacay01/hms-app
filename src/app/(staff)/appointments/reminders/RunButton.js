"use client";

import { useActionState } from "react";
import { runReminders } from "./actions";

export default function RunButton({ date, concurrency }) {
  const [state, action, pending] = useActionState(runReminders, {});
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="date" value={date} />
      <button disabled={pending} className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold hover:bg-accent-hover disabled:opacity-60">
        {pending ? `Sending (${concurrency} at a time)…` : "Send reminders now"}
      </button>
      {state?.savedAt && (
        <p className="text-sm text-white/75">
          {state.total === 0
            ? "Nothing to send — everyone booked is already reminded."
            : `${state.total} processed in ${state.ms} ms, ${concurrency} at a time: ${state.sent} sent, ${state.failed} failed, ${state.skipped} skipped.`}
        </p>
      )}
    </form>
  );
}
