"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { DAY_NAMES, SLOT_MINUTES } from "@/lib/time";

const input =
  "w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white focus:border-white/40 focus:outline-none";

export default function RescheduleForm({ action, doctors, defaultDoctorId, defaultDateTime, minDateTime, cancelHref }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [doctorId, setDoctorId] = useState(defaultDoctorId);
  const doctor = doctors.find((d) => d.id === doctorId);

  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-white/75">Doctor</span>
        <select name="doctorId" required value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className={input}>
          {doctors.map((d) => (
            <option key={d.id} value={d.id} className="bg-neutral-900">
              Dr {d.firstName} {d.lastName} — {d.department?.name ?? "No department"}
            </option>
          ))}
        </select>
        {doctor && (
          <span className="mt-1.5 block text-xs text-white/55">
            {doctor.schedules.length > 0
              ? `Works ${doctor.schedules
                  .map((s) => `${DAY_NAMES[s.dayOfWeek].slice(0, 3)} ${s.startTime}–${s.endTime}`)
                  .join(", ")}`
              : "No fixed schedule set."}
          </span>
        )}
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-white/75">New date and time</span>
        <input
          type="datetime-local"
          name="scheduledAt"
          required
          defaultValue={defaultDateTime}
          min={minDateTime}
          step={SLOT_MINUTES * 60}
          className={`${input} [color-scheme:dark]`}
        />
      </label>

      {state?.error && (
        <p role="alert" className="rounded-xl border border-accent/40 bg-accent/15 px-4 py-3 text-sm text-red-100">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? "Saving…" : "Reschedule"}
        </button>
        <Link href={cancelHref} className="rounded-full border border-white/15 px-6 py-2.5 text-sm text-white/80 hover:bg-white/10">
          Back
        </Link>
      </div>
    </form>
  );
}
