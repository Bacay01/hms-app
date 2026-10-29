"use client";

import Link from "next/link";
import { startTransition, useActionState } from "react";
import { emergencyCheckIn } from "../actions";
import { SEX_OPTIONS } from "@/lib/patients";

const input =
  "w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none";
const label = "mb-1.5 block text-xs font-medium text-white/75";

export default function EmergencyForm({ doctors }) {
  const [state, formAction, pending] = useActionState(emergencyCheckIn, {});

  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-5 rounded-2xl border border-accent/40 bg-accent/[0.06] p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset>
          <legend className={label}>
            Sex <span className="text-accent">*</span>
          </legend>
          <div className="flex gap-2">
            {SEX_OPTIONS.map((s) => (
              <label
                key={s.value}
                className="flex flex-1 cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent/15"
              >
                <input type="radio" name="sex" value={s.value} required className="accent-[#e5262a]" />
                {s.label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block">
          <span className={label}>
            Estimated age (years) <span className="text-accent">*</span>
          </span>
          <input name="approxAge" type="number" min={0} max={120} required placeholder="e.g. 30" className={input} />
        </label>
      </div>

      <label className="block">
        <span className={label}>
          Presenting complaint <span className="text-accent">*</span>
        </span>
        <input
          name="complaint"
          required
          placeholder="e.g. Road traffic accident, unconscious, heavy bleeding"
          className={input}
        />
      </label>

      <label className="block">
        <span className={label}>
          Doctor <span className="text-accent">*</span>
        </span>
        <select name="doctorId" required defaultValue="" className={input}>
          <option value="" disabled className="bg-neutral-900">Select a doctor</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id} className="bg-neutral-900">
              Dr {d.firstName} {d.lastName}
              {d.room ? ` — ${d.room}` : ""}
              {d.onDuty ? " (on duty)" : ""}
            </option>
          ))}
        </select>
      </label>

      <details className="rounded-xl border border-white/10 bg-black/20 p-4">
        <summary className="cursor-pointer text-sm text-white/75">Name or phone known? (optional)</summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className={label}>First name</span>
            <input name="firstName" className={input} />
          </label>
          <label className="block">
            <span className={label}>Last name</span>
            <input name="lastName" className={input} />
          </label>
          <label className="block">
            <span className={label}>Phone (patient or companion)</span>
            <input name="phone" type="tel" className={input} />
          </label>
        </div>
      </details>

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
          {pending ? "Adding…" : "Add to top of queue"}
        </button>
        <Link href="/appointments" className="rounded-full border border-white/15 px-6 py-2.5 text-sm text-white/80 hover:bg-white/10">
          Cancel
        </Link>
      </div>
    </form>
  );
}
