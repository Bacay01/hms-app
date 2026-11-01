"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { cancelLab, requestLab } from "../orders-actions";
import { LAB_STATUS_LABELS, LAB_TESTS } from "@/lib/labTests";

const input =
  "w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none";
const CATEGORIES = [...new Set(LAB_TESTS.map((t) => t.category))];

function LabRow({ lab, canWrite }) {
  const [state, action, pending] = useActionState(cancelLab, {});
  const cancelled = lab.status === "CANCELLED";
  return (
    <li className={`flex items-start justify-between gap-3 py-2.5 ${cancelled ? "opacity-50" : ""}`}>
      <div>
        <p className={`text-sm font-medium ${cancelled ? "line-through" : ""}`}>
          {lab.testName}
          {lab.urgent && (
            <span className="ml-2 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase">Urgent</span>
          )}
        </p>
        {lab.clinicalNote && <p className="text-xs text-white/50">{lab.clinicalNote}</p>}
        {state?.error && <p className="text-xs text-red-200">{state.error}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase text-white/70">
          {LAB_STATUS_LABELS[lab.status]}
        </span>
        {canWrite && lab.status === "REQUESTED" && (
          <form action={action}>
            <input type="hidden" name="labRequestId" value={lab.id} />
            <button
              disabled={pending}
              onClick={(e) => {
                if (!confirm(`Cancel ${lab.testName}?`)) e.preventDefault();
              }}
              className="rounded-lg border border-white/15 px-2.5 py-1 text-xs text-white/70 hover:bg-white/10 disabled:opacity-60"
            >
              {pending ? "…" : "Cancel"}
            </button>
          </form>
        )}
      </div>
    </li>
  );
}

export default function LabPanel({ encounterId, labs, canWrite }) {
  const [state, formAction, pending] = useActionState(requestLab.bind(null, encounterId), {});
  const formRef = useRef(null);

  useEffect(() => {
    if (state?.savedAt) formRef.current?.reset();
  }, [state?.savedAt]);

  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <div>
      {labs.length === 0 ? (
        <p className="text-sm text-white/55">No lab requests yet.</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {labs.map((lab) => (
            <LabRow key={lab.id} lab={lab} canWrite={canWrite} />
          ))}
        </ul>
      )}

      {canWrite && (
        <form ref={formRef} onSubmit={handleSubmit} className="mt-4 space-y-3">
          <select name="testCode" required defaultValue="" className={input}>
            <option value="" disabled className="bg-neutral-900">
              Choose a test…
            </option>
            {CATEGORIES.map((category) => (
              <optgroup key={category} label={category} className="bg-neutral-900">
                {LAB_TESTS.filter((t) => t.category === category).map((t) => (
                  <option key={t.code} value={t.code} className="bg-neutral-900">
                    {t.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <input name="clinicalNote" placeholder="Clinical note for the lab (optional)" className={input} />
          <label className="flex items-center gap-2 text-sm text-white/75">
            <input type="checkbox" name="urgent" className="size-4 accent-[#e5262a]" />
            Urgent
          </label>

          {state?.error && <p className="text-sm text-red-200">{state.error}</p>}
          {state?.success && <p className="text-sm text-white/75">{state.success}</p>}

          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold hover:bg-accent-hover disabled:opacity-50"
          >
            {pending ? "Requesting…" : "Request test"}
          </button>
        </form>
      )}
    </div>
  );
}
