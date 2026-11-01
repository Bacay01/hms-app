"use client";

import { startTransition, useActionState, useState } from "react";
import { completeVisit, startConsultation } from "../visit-actions";

const OUTCOMES = [
  { value: "DISCHARGED", label: "Discharge home" },
  { value: "REFERRED", label: "Refer" },
  { value: "ADMITTED", label: "Admit" },
];
const OUTCOME_LABELS = { DISCHARGED: "Discharged home", REFERRED: "Referred", ADMITTED: "Admitted" };

const input =
  "w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none";
const shell = "rounded-2xl border border-white/10 bg-white/[0.04] p-5";

export default function VisitActions({ encounterId, status, canWrite, outcome }) {
  const [startState, startAction, starting] = useActionState(startConsultation.bind(null, encounterId), {});
  const [doneState, doneAction, completing] = useActionState(completeVisit.bind(null, encounterId), {});
  const [choice, setChoice] = useState("DISCHARGED");

  if (outcome) {
    return (
      <section className={shell}>
        <p className="text-xs uppercase tracking-wider text-white/45">Visit completed</p>
        <p className="mt-1 text-lg font-semibold">
          {OUTCOME_LABELS[outcome.value]}
          {outcome.referredTo ? ` → ${outcome.referredTo}` : ""}
        </p>
        {outcome.note && <p className="mt-1 text-sm text-white/70">{outcome.note}</p>}
        {outcome.endedAt && <p className="mt-2 text-xs text-white/45">{outcome.endedAt}</p>}
      </section>
    );
  }

  if (!canWrite) return null;

  if (status === "WAITING" || status === "WITH_NURSE") {
    return (
      <section className={shell}>
        <p className="text-sm text-white/70">
          The patient is {status === "WAITING" ? "waiting" : "with the nurse"}. Calling them in shows their number on the
          waiting-room screen.
        </p>
        {startState?.error && <p className="mt-2 text-sm text-red-200">{startState.error}</p>}
        <form action={startAction} className="mt-3">
          <button
            disabled={starting}
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold hover:bg-accent-hover disabled:opacity-60"
          >
            {starting ? "Calling in…" : "Start consultation"}
          </button>
        </form>
      </section>
    );
  }

  if (status !== "WITH_DOCTOR") return null;

  function handleSubmit(event) {
    event.preventDefault();
    const label = OUTCOMES.find((o) => o.value === choice)?.label ?? "Complete";
    if (!confirm(`${label} and complete this visit? Vitals, prescriptions and lab requests will lock.`)) return;
    const formData = new FormData(event.currentTarget);
    startTransition(() => doneAction(formData));
  }

  return (
    <section className={shell}>
      <h2 className="text-sm font-semibold">Complete visit</h2>
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {OUTCOMES.map((o) => (
            <label
              key={o.value}
              className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm ${
                choice === o.value ? "border-accent bg-accent/20 text-white" : "border-white/15 text-white/70 hover:bg-white/5"
              }`}
            >
              <input
                type="radio"
                name="outcome"
                value={o.value}
                checked={choice === o.value}
                onChange={() => setChoice(o.value)}
                className="sr-only"
              />
              {o.label}
            </label>
          ))}
        </div>

        {choice === "REFERRED" && (
          <input name="referredTo" required placeholder="Referred to: e.g. UCH Ibadan — Cardiology" className={input} />
        )}
        {choice === "ADMITTED" && (
          <p className="text-xs text-white/50">Ward and bed allocation comes with inpatient care (Phase 8).</p>
        )}

        <textarea
          name="outcomeNote"
          rows={2}
          placeholder="Discharge / follow-up note (optional): e.g. Review in 3 days with results"
          className={input}
        />

        {doneState?.error && (
          <p role="alert" className="rounded-xl border border-accent/40 bg-accent/15 px-3 py-2 text-sm text-red-100">
            {doneState.error}
          </p>
        )}

        <button
          type="submit"
          disabled={completing}
          className="rounded-full bg-accent px-5 py-2 text-sm font-semibold hover:bg-accent-hover disabled:opacity-60"
        >
          {completing ? "Completing…" : "Complete visit"}
        </button>
      </form>
    </section>
  );
}
