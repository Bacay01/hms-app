"use client";

import { useActionState } from "react";
import { callNext } from "./actions";
import QueueItem from "./QueueItem";

export default function QueueColumn({ column, canCallNext, doctors }) {
  const [state, action, pending] = useActionState(callNext, {});
  const otherDoctors = doctors.filter((d) => d.id !== column.id);
  // Who is in the consulting room right now (if anyone)
  const busyWith = column.active.find((e) => e.status === "WITH_DOCTOR")?.queueNumber ?? null;

  return (
    <section className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold">{column.name}</h3>
          <p className="text-xs text-white/50">
            {[column.department, column.room, column.hours].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/80">{column.waiting} waiting</span>
          {column.emergencies > 0 && (
            <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-white">
              {column.emergencies} emergency
            </span>
          )}
        </div>
      </div>

      {canCallNext && (
        <form action={action} className="mt-3">
          <input type="hidden" name="doctorId" value={column.id} />
          <button
            disabled={pending || column.waiting === 0}
            className="w-full rounded-xl bg-accent py-2 text-sm font-semibold transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "Calling…" : "Call next patient"}
          </button>
        </form>
      )}
      {state?.error && <p className="mt-2 text-xs text-red-200">{state.error}</p>}
      {state?.called && <p className="mt-2 text-xs text-white/70">Called number {state.called}.</p>}

      <ul className="mt-4 space-y-2">
        {column.active.length === 0 ? (
          <li className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-white/45">
            No patients in the queue
          </li>
        ) : (
          column.active.map((item) => <QueueItem key={item.id} item={item} doctors={otherDoctors} busyWith={busyWith} />)
        )}
      </ul>

      <p className="mt-4 text-xs text-white/45">
        {column.done} seen today
        {column.left > 0 ? ` · ${column.left} left without being seen` : ""}
      </p>
    </section>
  );
}
