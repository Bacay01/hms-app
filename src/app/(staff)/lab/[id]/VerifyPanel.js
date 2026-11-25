"use client";

import { startTransition, useActionState } from "react";

export default function VerifyPanel({ action, resultedAt }) {
  const [state, formAction, pending] = useActionState(action, {});

  function handleSubmit(event) {
    event.preventDefault();
    const submitter = event.nativeEvent.submitter;
    if (submitter?.value === "VERIFY" && !confirm("Verify and release these results to the doctor?")) return;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input type="hidden" name="resultedAt" value={resultedAt} />
      <input
        name="note"
        placeholder="Note (required to return, e.g. 'Repeat Hb — sample clotted?')"
        className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none"
      />
      <div className="flex flex-wrap gap-2">
        <button name="decision" value="VERIFY" disabled={pending} className="rounded-full bg-accent px-5 py-2 text-sm font-semibold hover:bg-accent-hover disabled:opacity-60">
          Verify &amp; release
        </button>
        <button name="decision" value="RETURN" disabled={pending} className="rounded-full border border-white/15 px-5 py-2 text-sm hover:bg-white/10 disabled:opacity-60">
          Return for correction
        </button>
      </div>
      {state?.error && <p className="text-sm text-red-200">{state.error}</p>}
      {state?.success && <p className="text-sm text-white/75">{state.success}</p>}
    </form>
  );
}
