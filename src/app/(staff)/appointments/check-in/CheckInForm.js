"use client";

import Link from "next/link";
import { startTransition, useActionState } from "react";
import { checkIn } from "../actions";
import { VISIT_TYPES } from "@/lib/queue";
import PriorityPicker from "@/components/staff/PriorityPicker";

const input =
  "w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none";

export default function CheckInForm({ patientId, doctors, defaultVisitType }) {
  const [state, formAction, pending] = useActionState(checkIn, {});

  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <input type="hidden" name="patientId" value={patientId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-white/75">Doctor</span>
          <select name="doctorId" required defaultValue="" className={input}>
            <option value="" disabled className="bg-neutral-900">Select a doctor</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id} className="bg-neutral-900">
                Dr {d.firstName} {d.lastName} — {d.department ?? "No department"}
                {d.onDuty ? " (on duty)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-white/75">Visit type</span>
          <select name="visitType" defaultValue={defaultVisitType} className={input}>
            {VISIT_TYPES.map((t) => (
              <option key={t.value} value={t.value} className="bg-neutral-900">{t.label}</option>
            ))}
          </select>
        </label>
      </div>

      <PriorityPicker />

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-white/75">Reason for visit</span>
        <input name="reason" placeholder="e.g. Fever, headache" className={input} />
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
          {pending ? "Checking in…" : "Check in to queue"}
        </button>
        <Link href="/appointments" className="rounded-full border border-white/15 px-6 py-2.5 text-sm text-white/80 hover:bg-white/10">
          Cancel
        </Link>
      </div>
    </form>
  );
}
