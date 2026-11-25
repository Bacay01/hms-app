"use client";

import { startTransition, useActionState, useState } from "react";
import { FLAG_LABELS, evaluateResult, findRange, isCritical, rangeText } from "@/lib/labRanges";

const input =
  "w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none";

export function FlagChip({ flag }) {
  if (!flag) return null;
  const style = isCritical(flag) ? "bg-accent text-white" : "border border-accent/60 text-red-200";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${style}`}>{FLAG_LABELS[flag]}</span>;
}

export default function ResultForm({ action, analytes, patient, initial, initialComment }) {
  const [values, setValues] = useState(initial);
  const [state, formAction, pending] = useActionState(action, {});

  const evaluated = Object.fromEntries(
    analytes.map((a) => [a.code, values[a.code] ? evaluateResult(a, values[a.code], patient) : null])
  );
  const criticalNow = analytes.filter((a) => isCritical(evaluated[a.code]?.flag));

  function handleSubmit(event) {
    event.preventDefault();
    if (criticalNow.length && !confirm(`CRITICAL value (${criticalNow.map((a) => a.name).join(", ")}). The requesting doctor must be called now. Save?`)) return;
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="divide-y divide-white/5">
        {analytes.map((a) => {
          const range = a.type === "number" ? rangeText(findRange(a.ranges ?? [], patient.sex, patient.age)) : null;
          const e = evaluated[a.code];
          return (
            <div key={a.code} className="grid items-center gap-3 py-3 sm:grid-cols-[1.4fr_1fr_1fr]">
              <div>
                <p className="text-sm font-medium">{a.name}</p>
                <p className="text-xs text-white/45">
                  {a.unit ? `${a.unit} · ` : ""}
                  {range ? `ref ${range}` : a.type === "choice" && a.abnormal?.length ? `normal: ${e?.refText ?? a.options[0]}` : ""}
                </p>
              </div>

              {a.type === "choice" ? (
                <select
                  name={a.code}
                  value={values[a.code] ?? ""}
                  onChange={(ev) => setValues((v) => ({ ...v, [a.code]: ev.target.value }))}
                  className={input}
                >
                  <option value="" className="bg-neutral-900">Choose…</option>
                  {a.options.map((o) => (
                    <option key={o} value={o} className="bg-neutral-900">
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  name={a.code}
                  value={values[a.code] ?? ""}
                  onChange={(ev) => setValues((v) => ({ ...v, [a.code]: ev.target.value }))}
                  inputMode={a.type === "number" ? "decimal" : "text"}
                  placeholder={a.type === "number" ? "Value" : "Optional"}
                  className={input}
                />
              )}

              <div>
                <FlagChip flag={e?.flag} />
              </div>
            </div>
          );
        })}
      </div>

      <label className="block">
        <span className="mb-1 block text-xs text-white/60">Comment (optional)</span>
        <textarea name="comment" rows={2} defaultValue={initialComment ?? ""} className={input} />
      </label>

      {state?.error && (
        <p role="alert" className="rounded-xl border border-accent/40 bg-accent/15 px-3 py-2 text-sm text-red-100">
          {state.error}
        </p>
      )}
      {state?.success && <p className="text-sm text-white/75">{state.success}</p>}
      {state?.critical?.length > 0 && (
        <div className="rounded-xl bg-accent px-4 py-3 text-sm text-white">
          <p className="font-semibold">Critical result — call the requesting doctor now:</p>
          <ul className="mt-1 list-disc pl-5">
            {state.critical.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save results"}
      </button>
    </form>
  );
}
