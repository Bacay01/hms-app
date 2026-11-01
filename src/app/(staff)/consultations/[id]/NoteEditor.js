"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { NOTE_FIELDS } from "@/lib/noteHistory";

const textarea =
  "w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none";

const labelFor = (key) => NOTE_FIELDS.find((f) => f.key === key)?.label ?? key;

function Sections({ note }) {
  const filled = NOTE_FIELDS.filter((f) => note[f.key]);
  if (filled.length === 0) return <p className="text-sm text-white/50">Empty.</p>;
  return (
    <div className="space-y-3">
      {filled.map((f) => (
        <div key={f.key}>
          <p className="text-[11px] font-medium uppercase tracking-wider text-white/45">{f.label}</p>
          <p className="mt-0.5 whitespace-pre-wrap text-sm text-white/90">{note[f.key]}</p>
        </div>
      ))}
    </div>
  );
}

export default function NoteEditor({ action, versions, canWrite, visitEnded, intact }) {
  const latest = versions[0] ?? null;
  const [editing, setEditing] = useState(!latest && canWrite);
  const [state, formAction, pending] = useActionState(action, {});

  useEffect(() => {
    if (state?.savedAt) setEditing(false);
  }, [state?.savedAt]);

  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <div>
      {!intact && (
        <p className="mb-3 rounded-xl border border-accent/40 bg-accent/15 px-3 py-2 text-xs text-red-100">
          The version chain looks inconsistent, so versions are shown by number instead.
        </p>
      )}

      {editing ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="hidden" name="baseId" value={latest?.id ?? ""} />
          {NOTE_FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="mb-1 block text-[11px] font-medium text-white/65">{f.label}</span>
              <textarea
                name={f.key}
                rows={f.key === "presentingComplaint" ? 2 : 3}
                defaultValue={latest?.[f.key] ?? ""}
                className={textarea}
              />
            </label>
          ))}
          {latest && (
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-white/65">
                Reason for change {visitEnded ? "(required — the visit has ended)" : "(optional)"}
              </span>
              <input name="amendReason" required={visitEnded} className={textarea} />
            </label>
          )}

          {state?.error && (
            <p role="alert" className="rounded-xl border border-accent/40 bg-accent/15 px-3 py-2 text-sm text-red-100">
              {state.error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold hover:bg-accent-hover disabled:opacity-60"
            >
              {pending ? "Saving…" : latest ? "Save new version" : "Save note"}
            </button>
            {latest && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-full border border-white/15 px-5 py-2 text-sm text-white/80 hover:bg-white/10"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : latest ? (
        <div>
          <Sections note={latest} />
          <p className="mt-4 text-xs text-white/45">
            Version {latest.version} · {latest.author} · {latest.createdAt}
          </p>
          {state?.success && <p className="mt-2 text-sm text-white/75">{state.success}</p>}
          {canWrite && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="mt-3 rounded-full border border-white/15 px-4 py-1.5 text-sm hover:bg-white/10"
            >
              {visitEnded ? "Amend note" : "Edit note"}
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-white/55">No clinical note yet.</p>
      )}

      {versions.length > 1 && (
        <details className="mt-5">
          <summary className="cursor-pointer text-sm text-white/60 hover:text-white">
            Version history ({versions.length} versions)
          </summary>
          <ol className="mt-3 space-y-2">
            {versions.map((v) => (
              <li key={v.id} className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
                <p className="font-medium text-white">
                  Version {v.version} · {v.author} · {v.createdAt}
                </p>
                {v.amendReason && <p className="mt-1 text-white/70">Reason: {v.amendReason}</p>}
                <p className="mt-1 text-white/50">
                  {v.version === 1 ? "First draft" : `Changed: ${v.changed.map(labelFor).join(", ") || "—"}`}
                </p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-white/55 hover:text-white">View this version</summary>
                  <div className="mt-2">
                    <Sections note={v} />
                  </div>
                </details>
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
