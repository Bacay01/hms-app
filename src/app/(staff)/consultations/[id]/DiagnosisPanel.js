"use client";

import { startTransition, useActionState, useEffect, useMemo, useState } from "react";
import { addDiagnosis, removeDiagnosis } from "../clinical-actions";
import { DIAGNOSES } from "@/lib/diagnoses";
import { buildDiagnosisIndex, searchDiagnoses } from "@/lib/diagnosisSearch";

const input =
  "w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none";

function DiagnosisRow({ diagnosis, canWrite }) {
  const [state, action, pending] = useActionState(removeDiagnosis, {});
  return (
    <li className="flex items-start justify-between gap-3 py-2.5">
      <div>
        <p className="text-sm font-medium">
          {diagnosis.name}
          {diagnosis.isPrimary && (
            <span className="ml-2 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-100">
              Primary
            </span>
          )}
          {diagnosis.provisional && (
            <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase text-white/70">Provisional</span>
          )}
        </p>
        <p className="font-mono text-xs text-white/45">{diagnosis.code ?? "Free text"}</p>
        {state?.error && <p className="text-xs text-red-200">{state.error}</p>}
      </div>
      {canWrite && (
        <form action={action}>
          <input type="hidden" name="diagnosisId" value={diagnosis.id} />
          <button
            disabled={pending}
            onClick={(e) => {
              if (!confirm(`Remove "${diagnosis.name}"?`)) e.preventDefault();
            }}
            className="rounded-lg border border-white/15 px-2.5 py-1 text-xs text-white/70 hover:bg-white/10 disabled:opacity-60"
          >
            {pending ? "…" : "Remove"}
          </button>
        </form>
      )}
    </li>
  );
}

export default function DiagnosisPanel({ encounterId, diagnoses, canWrite }) {
  // Built once in the browser: every word of every diagnosis → Trie
  const index = useMemo(() => buildDiagnosisIndex(DIAGNOSES), []);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState(null);
  const [state, formAction, pending] = useActionState(addDiagnosis.bind(null, encounterId), {});

  const suggestions = picked || query.trim().length < 2 ? [] : searchDiagnoses(index, query, 8);

  useEffect(() => {
    if (state?.savedAt) {
      setQuery("");
      setPicked(null);
    }
  }, [state?.savedAt]);

  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <div>
      {diagnoses.length === 0 ? (
        <p className="text-sm text-white/55">No diagnosis yet.</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {diagnoses.map((d) => (
            <DiagnosisRow key={d.id} diagnosis={d} canWrite={canWrite} />
          ))}
        </ul>
      )}

      {canWrite && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input type="hidden" name="code" value={picked?.code ?? ""} />
          <input type="hidden" name="name" value={picked?.name ?? query} />

          <div className="relative">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPicked(null);
              }}
              placeholder="Search: e.g. mal, hyp, uti, B54, apollo"
              autoComplete="off"
              className={input}
            />
            {suggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-white/15 bg-neutral-900 py-1 shadow-xl">
                {suggestions.map((d) => (
                  <li key={d.code}>
                    <button
                      type="button"
                      onClick={() => {
                        setPicked(d);
                        setQuery(d.name);
                      }}
                      className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-white/10"
                    >
                      <span>{d.name}</span>
                      <span className="shrink-0 font-mono text-xs text-white/50">{d.code}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {query.trim() && !picked && (
            <p className="text-xs text-white/45">Not in the list? It will be added as free text without a code.</p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-white/75">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="provisional" className="size-4 accent-[#e5262a]" />
              Provisional
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="primary" className="size-4 accent-[#e5262a]" />
              Make primary
            </label>
          </div>

          {state?.error && <p className="text-sm text-red-200">{state.error}</p>}

          <button
            type="submit"
            disabled={pending || !query.trim()}
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold hover:bg-accent-hover disabled:opacity-50"
          >
            {pending ? "Adding…" : "Add diagnosis"}
          </button>
        </form>
      )}
    </div>
  );
}
