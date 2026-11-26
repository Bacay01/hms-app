"use client";

import { useActionState } from "react";

export default function PreauthForm({ action }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="mt-1 flex flex-wrap items-center gap-1.5">
      <input name="code" placeholder="Authorization code" className="w-40 rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-xs text-white placeholder:text-white/35" />
      <button disabled={pending} className="rounded-full bg-accent px-3 py-1 text-xs font-semibold hover:bg-accent-hover disabled:opacity-60">
        {pending ? "…" : "Authorize"}
      </button>
      {state?.error && <span className="text-xs text-red-200">{state.error}</span>}
    </form>
  );
}
