"use client";

import { useActionState, useState } from "react";
import { closeRequest } from "./actions";

const button = "rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-60";

export default function RequestActions({ id }) {
  const [state, action, pending] = useActionState(closeRequest, {});
  const [declining, setDeclining] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <form action={action} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={id} />
        {declining ? (
          <>
            <input
              name="staffNote"
              required
              maxLength={200}
              autoFocus
              placeholder="Why? e.g. couldn't reach after 3 calls"
              className="w-72 rounded-full border border-white/15 bg-black/30 px-4 py-2 text-sm text-white placeholder:text-white/40"
            />
            <button name="status" value="DECLINED" disabled={pending} className={button}>Decline</button>
            <button type="button" onClick={() => setDeclining(false)} className="text-sm text-white/60 hover:text-white">
              Cancel
            </button>
          </>
        ) : (
          <>
            <button name="status" value="BOOKED" disabled={pending} className={button}>Mark as booked</button>
            <button type="button" onClick={() => setDeclining(true)} className={button}>Decline…</button>
          </>
        )}
      </form>
      {state.error && <p className="text-sm text-red-300">{state.error}</p>}
    </div>
  );
}
