"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestAppointment } from "./actions";
import { TIME_SLOTS } from "@/lib/bookingRequest";

const inputClass =
  "w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none transition-colors focus:border-white/40 [color-scheme:dark]";
const labelClass = "mb-1.5 block text-xs font-medium text-white/80";

function FieldError({ message, id }) {
  return message ? <p id={id} className="mt-1 text-xs text-red-300">{message}</p> : null;
}

export default function BookingForm({ departments, minDate, maxDate }) {
  const [state, formAction, pending] = useActionState(requestAppointment, {});
  const v = state.values ?? {};
  const e = state.errors ?? {};

  if (state.done) {
    return (
      <div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-xl sm:p-8" role="status">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          {state.duplicate ? "Already received" : "Request received"}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white">
          {state.duplicate ? "We already have your request" : "Thank you — we'll call you"}
        </h1>
        {state.reference ? (
          <>
            <p className="mt-3 text-sm text-white/75">
              Our front desk will call <span className="font-medium text-white">{state.phone}</span> to confirm a time,
              usually within one working day.
            </p>
            <p className="mt-5 rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white/70">
              Your reference: <span className="font-mono text-base font-semibold text-white">{state.reference}</span>
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm text-white/75">Our front desk will call you to confirm a time.</p>
        )}
        <Link href="/" className="mt-6 inline-block rounded-full border border-white/20 px-5 py-2.5 text-sm text-white hover:bg-white/10">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-xl sm:p-8">
      <h1 className="text-2xl font-semibold text-white">Book an appointment</h1>
      <p className="mt-1 text-sm text-white/70">Send a request and we&apos;ll call you to confirm.</p>

      {state.error && (
        <p className="mt-4 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-red-100" role="alert">
          {state.error}
        </p>
      )}

      <form action={formAction} className="mt-6 space-y-4" noValidate>
        {/* Honeypot — hidden from people, bots fill it in */}
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <div>
          <label htmlFor="fullName" className={labelClass}>Full name</label>
          <input id="fullName" name="fullName" autoComplete="name" required defaultValue={v.fullName}
            aria-invalid={!!e.fullName} aria-describedby="fullName-err" placeholder="e.g. Adaeze Okafor" className={inputClass} />
          <FieldError id="fullName-err" message={e.fullName} />
        </div>

        <div>
          <label htmlFor="phone" className={labelClass}>Phone number</label>
          <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required defaultValue={v.phone}
            aria-invalid={!!e.phone} aria-describedby="phone-err" placeholder="0803 123 4567" className={inputClass} />
          <FieldError id="phone-err" message={e.phone} />
        </div>

        <div>
          <label htmlFor="departmentId" className={labelClass}>Department <span className="text-white/45">(optional)</span></label>
          <select id="departmentId" name="departmentId" defaultValue={v.departmentId ?? ""}
            aria-describedby="departmentId-err" className={inputClass}>
            <option value="">Not sure — help me choose</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <FieldError id="departmentId-err" message={e.departmentId} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="preferredDate" className={labelClass}>Preferred date</label>
            <input id="preferredDate" name="preferredDate" type="date" required min={minDate} max={maxDate}
              defaultValue={v.preferredDate} aria-invalid={!!e.preferredDate} aria-describedby="preferredDate-err" className={inputClass} />
            <FieldError id="preferredDate-err" message={e.preferredDate} />
          </div>
          <div>
            <label htmlFor="preferredTime" className={labelClass}>Time of day</label>
            <select id="preferredTime" name="preferredTime" required defaultValue={v.preferredTime ?? "MORNING"}
              aria-describedby="preferredTime-err" className={inputClass}>
              {Object.entries(TIME_SLOTS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <FieldError id="preferredTime-err" message={e.preferredTime} />
          </div>
        </div>

        <div>
          <label htmlFor="reason" className={labelClass}>Anything we should know? <span className="text-white/45">(optional)</span></label>
          <textarea id="reason" name="reason" rows={3} maxLength={300} defaultValue={v.reason}
            aria-describedby="reason-err" placeholder="e.g. Follow-up visit, or a child's fever" className={inputClass} />
          <FieldError id="reason-err" message={e.reason} />
        </div>

        <div>
          <label className="flex items-start gap-3 text-xs leading-relaxed text-white/70">
            <input type="checkbox" name="consent" className="mt-0.5 size-4 accent-[var(--color-accent)]" aria-describedby="consent-err" />
            <span>
              I agree that the hospital may store these details and call or text me about this appointment,
              in line with the Nigeria Data Protection Act 2023.
            </span>
          </label>
          <FieldError id="consent-err" message={e.consent} />
        </div>

        <button type="submit" disabled={pending}
          className="w-full rounded-full bg-accent py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60">
          {pending ? "Sending…" : "Request appointment"}
        </button>
      </form>
    </div>
  );
}
