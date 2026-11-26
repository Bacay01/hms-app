"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";

const input =
  "w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none";
const primary = "rounded-full bg-accent px-4 py-2 text-sm font-semibold hover:bg-accent-hover disabled:opacity-60";

function Status({ state }) {
  if (state?.error) return <p className="text-sm text-red-200">{state.error}</p>;
  if (state?.success) return <p className="text-sm text-white/75">{state.success}</p>;
  return null;
}

// wards: [{ name, beds: [{ id, label }] }] — free beds only
export function BedPicker({ action, wards, label = "Admit to bed" }) {
  const [state, formAction, pending] = useActionState(action, {});
  const hasFree = wards.some((w) => w.beds.length > 0);
  if (!hasFree) return <p className="text-sm text-red-200">No free beds. Discharge a patient or add beds in ward setup.</p>;

  return (
    <form action={formAction} className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <select name="bedId" required defaultValue="" className={`${input} max-w-xs`}>
          <option value="" disabled className="bg-neutral-900">Choose a free bed…</option>
          {wards
            .filter((w) => w.beds.length)
            .map((w) => (
              <optgroup key={w.name} label={w.name} className="bg-neutral-900">
                {w.beds.map((b) => (
                  <option key={b.id} value={b.id} className="bg-neutral-900">
                    {w.name} — {b.label}
                  </option>
                ))}
              </optgroup>
            ))}
        </select>
        <button disabled={pending} className={primary}>
          {pending ? "…" : label}
        </button>
      </div>
      <Status state={state} />
    </form>
  );
}

export function NoteForm({ action }) {
  const [state, formAction, pending] = useActionState(action, {});
  const formRef = useRef(null);
  useEffect(() => {
    if (state?.savedAt) formRef.current?.reset();
  }, [state?.savedAt]);

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <textarea name="note" rows={2} placeholder="e.g. Comfortable overnight. Temp 37.4. Tolerating oral fluids." className={input} />
      <div className="flex items-center gap-3">
        <button disabled={pending} className={primary}>
          {pending ? "Saving…" : "Add note"}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function MedForm({ action, prescriptionId }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-wrap items-center justify-end gap-2">
      <input type="hidden" name="prescriptionId" value={prescriptionId} />
      <select name="status" defaultValue="GIVEN" className="rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs">
        <option value="GIVEN" className="bg-neutral-900">Given</option>
        <option value="HELD" className="bg-neutral-900">Held</option>
        <option value="REFUSED" className="bg-neutral-900">Refused</option>
      </select>
      <input name="note" placeholder="Note (needed if held/refused)" className="w-48 rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs" />
      <button disabled={pending} className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold hover:bg-accent-hover disabled:opacity-60">
        {pending ? "…" : "Record"}
      </button>
      {state?.error && <p className="w-full text-right text-xs text-red-200">{state.error}</p>}
      {state?.success && <p className="w-full text-right text-xs text-white/70">{state.success}</p>}
    </form>
  );
}

export function DischargeForm({ action }) {
  const [state, formAction, pending] = useActionState(action, {});
  function handleSubmit(event) {
    event.preventDefault();
    if (!confirm("Discharge this patient? The bed will be freed and bed charges finalised.")) return;
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input name="dischargeDiagnosis" placeholder="Discharge diagnosis, e.g. Severe malaria — resolved" className={input} />
      <textarea name="dischargeSummary" rows={4} placeholder="Summary: presentation, treatment given, progress, condition on discharge" className={input} />
      <input name="followUp" placeholder="Follow-up (optional), e.g. Review in OPD in 1 week with FBC" className={input} />
      <div className="flex items-center gap-3">
        <button disabled={pending} className={primary}>
          {pending ? "Discharging…" : "Discharge patient"}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function WardForm({ action }) {
  const [state, formAction, pending] = useActionState(action, {});
  const formRef = useRef(null);
  useEffect(() => {
    if (state?.savedAt) formRef.current?.reset();
  }, [state?.savedAt]);
  return (
    <form ref={formRef} action={formAction} className="grid gap-3 sm:grid-cols-[1.3fr_1.3fr_1fr_0.7fr_auto] sm:items-end">
      <input name="name" placeholder="Ward name, e.g. Male Medical" className={input} />
      <input name="kind" placeholder="Type (optional), e.g. General" className={input} />
      <input name="rate" inputMode="decimal" placeholder="Daily rate ₦" className={input} />
      <input name="beds" type="number" min="1" max="60" placeholder="Beds" className={input} />
      <button disabled={pending} className={primary}>
        {pending ? "…" : "Create ward"}
      </button>
      <div className="sm:col-span-5">
        <Status state={state} />
      </div>
    </form>
  );
}

export function AddBedsForm({ action }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex items-center gap-2">
      <input name="count" type="number" min="1" max="30" placeholder="+ beds" className="w-24 rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs" />
      <button disabled={pending} className="rounded-full border border-white/15 px-3 py-1.5 text-xs hover:bg-white/10 disabled:opacity-60">
        Add
      </button>
      {state?.error && <span className="text-xs text-red-200">{state.error}</span>}
      {state?.success && <span className="text-xs text-white/70">{state.success}</span>}
    </form>
  );
}
