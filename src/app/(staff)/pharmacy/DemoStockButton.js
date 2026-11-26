"use client";

import { useActionState } from "react";
import { loadDemoStock } from "./stock-actions";

export default function DemoStockButton() {
  const [state, action, pending] = useActionState(loadDemoStock, {});
  return (
    <form action={action} className="flex items-center gap-3">
      <button disabled={pending} className="rounded-full border border-dashed border-white/25 px-4 py-2 text-sm text-white/70 hover:bg-white/10 disabled:opacity-60">
        {pending ? "Loading…" : "Load demo stock (dev only)"}
      </button>
      {state?.error && <span className="text-sm text-red-200">{state.error}</span>}
      {state?.success && <span className="text-sm text-white/70">{state.success}</span>}
    </form>
  );
}
