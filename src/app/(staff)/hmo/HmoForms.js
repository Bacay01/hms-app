"use client";

import { useActionState, useEffect, useRef } from "react";

const input =
  "w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none";
const primary = "rounded-full bg-accent px-4 py-2 text-sm font-semibold hover:bg-accent-hover disabled:opacity-60";
const CATS = [
  ["CONSULTATION", "Consultation"],
  ["LAB", "Lab"],
  ["DRUG", "Drugs"],
  ["BED", "Bed"],
  ["PROCEDURE", "Procedures"],
];

function useResetOnSave(state) {
  const ref = useRef(null);
  useEffect(() => {
    if (state?.savedAt) ref.current?.reset();
  }, [state?.savedAt]);
  return ref;
}

function Status({ state }) {
  if (state?.error) return <p className="text-sm text-red-200">{state.error}</p>;
  if (state?.success) return <p className="text-sm text-white/75">{state.success}</p>;
  return null;
}

export function SimpleAction({ action, label, confirmText, className = primary }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <button
        disabled={pending}
        onClick={(e) => {
          if (confirmText && !confirm(confirmText)) e.preventDefault();
        }}
        className={className}
      >
        {pending ? "…" : label}
      </button>
      <Status state={state} />
    </form>
  );
}

export function HmoForm({ action }) {
  const [state, formAction, pending] = useActionState(action, {});
  const ref = useResetOnSave(state);
  return (
    <form ref={ref} action={formAction} className="grid gap-3 sm:grid-cols-[1.5fr_0.7fr_auto_auto] sm:items-center">
      <input name="name" placeholder="HMO name" className={input} />
      <input name="code" placeholder="Code, e.g. GRN" className={input} />
      <label className="flex items-center gap-2 text-sm text-white/75">
        <input type="checkbox" name="isNhia" className="size-4 accent-[#e5262a]" /> NHIA
      </label>
      <button disabled={pending} className={primary}>{pending ? "…" : "Add HMO"}</button>
      <div className="sm:col-span-4"><Status state={state} /></div>
    </form>
  );
}

export function PlanForm({ action }) {
  const [state, formAction, pending] = useActionState(action, {});
  const ref = useResetOnSave(state);
  return (
    <form ref={ref} action={formAction} className="space-y-3">
      <input name="name" placeholder="Plan name, e.g. Gold" className={`${input} max-w-xs`} />
      <div className="grid gap-2 sm:grid-cols-5">
        {CATS.map(([code, label]) => (
          <div key={code} className="rounded-xl border border-white/10 p-2">
            <p className="text-xs text-white/60">{label} %</p>
            <input name={`pct_${code}`} type="number" min="0" max="100" defaultValue="100" className={`${input} mt-1 py-1.5`} />
            <label className="mt-1 flex items-center gap-1.5 text-[11px] text-white/60">
              <input type="checkbox" name={`pa_${code}`} className="size-3.5 accent-[#e5262a]" /> Pre-auth
            </label>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button disabled={pending} className={primary}>{pending ? "…" : "Add plan"}</button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function EnrolForm({ action, plans }) {
  const [state, formAction, pending] = useActionState(action, {});
  const ref = useResetOnSave(state);
  return (
    <form ref={ref} action={formAction} className="grid gap-3 sm:grid-cols-2">
      <input name="hospitalNumber" placeholder="Hospital number, e.g. ILH-2026-000003" className={input} />
      <select name="planId" defaultValue="" className={input}>
        <option value="" disabled className="bg-neutral-900">Choose HMO plan…</option>
        {plans.map((p) => (
          <option key={p.id} value={p.id} className="bg-neutral-900">{p.label}</option>
        ))}
      </select>
      <input name="enrolmentNumber" placeholder="Enrolment number (from the HMO card)" className={input} />
      <input name="validUntil" type="date" className={`${input} [color-scheme:dark]`} />
      <div className="flex items-center gap-3 sm:col-span-2">
        <button disabled={pending} className={primary}>{pending ? "…" : "Enrol patient"}</button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function EndEnrolmentButton({ action, enrolmentId }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction}>
      <input type="hidden" name="enrolmentId" value={enrolmentId} />
      <button
        disabled={pending}
        onClick={(e) => {
          if (!confirm("End this enrolment? New visits will be billed to the patient.")) e.preventDefault();
        }}
        className="rounded-lg border border-white/15 px-2.5 py-1 text-xs hover:bg-white/10 disabled:opacity-60"
      >
        End
      </button>
      {state?.error && <span className="ml-2 text-xs text-red-200">{state.error}</span>}
    </form>
  );
}

export function SubmitClaimForm({ action, totalKobo, billCount }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="totalKobo" value={totalKobo} />
      <input type="hidden" name="billCount" value={billCount} />
      <button
        disabled={pending}
        onClick={(e) => {
          if (!confirm("Mark this month's claim as submitted? The total is recorded as a snapshot.")) e.preventDefault();
        }}
        className={primary}
      >
        {pending ? "…" : "Mark as submitted"}
      </button>
      <Status state={state} />
    </form>
  );
}
