"use client";

import { startTransition, useActionState, useEffect, useMemo, useState } from "react";
import { addPrescription, cancelPrescription } from "../orders-actions";
import { DRUGS, DRUG_BY_ID, buildInteractionGraph } from "@/lib/drugs";
import { buildDrugIndex, searchDrugs } from "@/lib/drugSearch";
import { FREQUENCIES, calcQuantity, checkPrescription, units } from "@/lib/prescribing";

const input =
  "w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none";
const freqLabel = (code) => FREQUENCIES.find((f) => f.code === code)?.label ?? code;

function IssueList({ issues }) {
  if (issues.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {issues.map((issue, i) => (
        <li
          key={i}
          className={`rounded-lg px-3 py-2 text-xs ${
            issue.severity === "major" ? "border border-accent/50 bg-accent/20 text-red-100" : "border border-white/15 text-white/75"
          }`}
        >
          <span className="font-semibold uppercase">
            {issue.severity === "major" ? "Serious" : "Caution"} · {issue.type}
          </span>{" "}
          — {issue.message}
        </li>
      ))}
    </ul>
  );
}

function PrescriptionRow({ rx, canWrite }) {
  const [state, action, pending] = useActionState(cancelPrescription, {});
  const cancelled = rx.status === "CANCELLED";
  return (
    <li className={`py-3 ${cancelled ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-sm font-medium ${cancelled ? "line-through" : ""}`}>{rx.drugName}</p>
          <p className="text-xs text-white/60">
            {units(rx.doseQty, rx.unit)} · {freqLabel(rx.frequency)}
            {rx.frequency !== "STAT" && ` · ${rx.durationDays} day${rx.durationDays === 1 ? "" : "s"}`} →{" "}
            <span className="font-semibold text-white/85">{units(rx.quantity, rx.unit)}</span>
          </p>
          {rx.instructions && <p className="text-xs text-white/50">{rx.instructions}</p>}
          {rx.overrideReason && <p className="mt-1 text-xs text-red-200">Warning overridden: {rx.overrideReason}</p>}
          {state?.error && <p className="text-xs text-red-200">{state.error}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase text-white/70">{rx.status.toLowerCase()}</span>
          {canWrite && rx.status === "PENDING" && (
            <form action={action}>
              <input type="hidden" name="prescriptionId" value={rx.id} />
              <button
                disabled={pending}
                onClick={(e) => {
                  if (!confirm(`Cancel ${rx.drugName}?`)) e.preventDefault();
                }}
                className="rounded-lg border border-white/15 px-2.5 py-1 text-xs text-white/70 hover:bg-white/10 disabled:opacity-60"
              >
                {pending ? "…" : "Cancel"}
              </button>
            </form>
          )}
        </div>
      </div>
    </li>
  );
}

export default function PrescriptionPanel({ encounterId, prescriptions, allergies, canWrite }) {
  const index = useMemo(() => buildDrugIndex(DRUGS), []);
  const graph = useMemo(() => buildInteractionGraph(), []);

  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState(null);
  const [doseQty, setDoseQty] = useState("1");
  const [frequency, setFrequency] = useState("TDS");
  const [days, setDays] = useState("5");
  const [instructions, setInstructions] = useState("");
  const [override, setOverride] = useState(false);
  const [state, formAction, pending] = useActionState(addPrescription.bind(null, encounterId), {});

  const currentDrugs = prescriptions
    .filter((p) => p.status !== "CANCELLED")
    .map((p) => DRUG_BY_ID.get(p.drugId))
    .filter(Boolean);

  // Live safety check as soon as a drug is picked (the server repeats it on save)
  const issues = picked ? checkPrescription({ drug: picked, currentDrugs, allergies }, graph) : [];
  const serious = issues.some((i) => i.severity === "major");
  const quantity = picked ? calcQuantity(Number(doseQty), frequency, Number(days)) : null;
  const suggestions = picked || query.trim().length < 2 ? [] : searchDrugs(index, query, 8);

  useEffect(() => {
    if (state?.savedAt) {
      setQuery("");
      setPicked(null);
      setInstructions("");
      setOverride(false);
    }
  }, [state?.savedAt]);

  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <div>
      {prescriptions.length === 0 ? (
        <p className="text-sm text-white/55">No prescriptions yet.</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {prescriptions.map((rx) => (
            <PrescriptionRow key={rx.id} rx={rx} canWrite={canWrite} />
          ))}
        </ul>
      )}

      {canWrite && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input type="hidden" name="drugId" value={picked?.id ?? ""} />

          <div className="relative">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPicked(null);
                setOverride(false);
              }}
              placeholder="Search drug: e.g. para, coartem, septrin"
              autoComplete="off"
              className={input}
            />
            {suggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-white/15 bg-neutral-900 py-1 shadow-xl">
                {suggestions.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setPicked(d);
                        setQuery(d.name);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-white/10"
                    >
                      {d.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {picked && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] text-white/60">Dose ({picked.unit}s)</span>
                  <input
                    name="doseQty"
                    type="number"
                    step="0.25"
                    min="0.25"
                    max="10"
                    value={doseQty}
                    onChange={(e) => setDoseQty(e.target.value)}
                    className={input}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] text-white/60">How often</span>
                  <select name="frequency" value={frequency} onChange={(e) => setFrequency(e.target.value)} className={input}>
                    {FREQUENCIES.map((f) => (
                      <option key={f.code} value={f.code} className="bg-neutral-900">
                        {f.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] text-white/60">Days</span>
                  <input
                    name="durationDays"
                    type="number"
                    min="1"
                    max="90"
                    value={frequency === "STAT" ? "1" : days}
                    disabled={frequency === "STAT"}
                    onChange={(e) => setDays(e.target.value)}
                    className={`${input} disabled:opacity-50`}
                  />
                </label>
              </div>

              <input
                name="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Instructions (optional): e.g. after food"
                className={input}
              />

              {quantity !== null && (
                <p className="text-sm text-white/75">
                  Pharmacy will dispense <span className="font-semibold text-white">{units(quantity, picked.unit)}</span>.
                </p>
              )}

              <IssueList issues={issues} />

              {serious && (
                <div className="space-y-2 rounded-xl border border-accent/40 p-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="override"
                      checked={override}
                      onChange={(e) => setOverride(e.target.checked)}
                      className="size-4 accent-[#e5262a]"
                    />
                    I have reviewed the serious warning and still want to prescribe
                  </label>
                  {override && <input name="overrideReason" required placeholder="Reason (recorded in the audit log)" className={input} />}
                </div>
              )}
            </>
          )}

          {state?.error && <p className="text-sm text-red-200">{state.error}</p>}
          {state?.success && !picked && <p className="text-sm text-white/75">{state.success}</p>}

          <button
            type="submit"
            disabled={pending || !picked || (serious && !override)}
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold hover:bg-accent-hover disabled:opacity-50"
          >
            {pending ? "Prescribing…" : "Prescribe"}
          </button>
        </form>
      )}
    </div>
  );
}
