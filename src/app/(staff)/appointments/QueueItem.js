"use client";

import Link from "next/link";
import { useActionState } from "react";
import { moveEncounter, reassignEncounter, setPriority } from "./actions";
import {
  ENCOUNTER_STATUS_LABELS,
  LONG_WAIT_MINUTES,
  PRIORITIES,
  VISIT_TYPES,
  formatWait,
  labelOf,
} from "@/lib/queue";

const STATUS_STYLE = {
  WAITING: "bg-white/10 text-white/80",
  WITH_NURSE: "bg-white/20 text-white",
  WITH_DOCTOR: "bg-accent/25 text-red-100",
};

const PRIORITY_STYLE = {
  EMERGENCY: "bg-accent text-white",
  URGENT: "border border-accent/60 text-red-200",
};

const smallButton =
  "rounded-lg border border-white/15 px-2.5 py-1 text-xs text-white/85 hover:bg-white/10 disabled:opacity-50";
const dangerButton =
  "rounded-lg border border-accent/40 px-2.5 py-1 text-xs text-red-200 hover:bg-accent/15 disabled:opacity-50";
const smallSelect = "rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-xs text-white";

export default function QueueItem({ item, doctors }) {
  const [moveState, moveAction, moving] = useActionState(moveEncounter, {});
  const [priorityState, priorityAction, savingPriority] = useActionState(setPriority, {});
  const [reassignState, reassignAction, reassigning] = useActionState(reassignEncounter, {});
  const error = moveState?.error || priorityState?.error || reassignState?.error;

  const primary = item.actions.filter((a) => !a.confirm);
  const secondary = item.actions.filter((a) => a.confirm);
  const longWait = item.status === "WAITING" && item.waitMinutes >= LONG_WAIT_MINUTES;
  const canReassign = item.canReassign && doctors.length > 0;
  const hasMore = secondary.length > 0 || item.canTriage || canReassign;

  return (
    <li
      className={`rounded-xl border bg-black/30 p-3 ${
        item.priority === "EMERGENCY" ? "border-accent/70" : "border-white/10"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-lg font-mono text-sm font-semibold ${
            item.priority === "EMERGENCY" ? "bg-accent text-white" : "bg-white/10"
          }`}
        >
          {item.queueNumber}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link href={`/patients/${item.patientId}`} className="truncate text-sm font-medium hover:underline">
              {item.patientName}
            </Link>
            {item.priority !== "NORMAL" && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  PRIORITY_STYLE[item.priority]
                }`}
              >
                {labelOf(PRIORITIES, item.priority)}
              </span>
            )}
          </div>
          <p className="truncate text-xs text-white/50">
            {item.hospitalNumber} · {labelOf(VISIT_TYPES, item.visitType)}
            {item.reason ? ` · ${item.reason}` : ""}
          </p>
          {item.provisional && (
            <p className="mt-1 text-[11px] text-red-200">Unidentified — complete details later</p>
          )}
          {item.allergy && <p className="mt-1 text-[11px] font-medium text-red-200">Allergy: {item.allergy}</p>}
        </div>

        <div className="shrink-0 text-right">
          <span className={`rounded-full px-2 py-0.5 text-[11px] ${STATUS_STYLE[item.status]}`}>
            {ENCOUNTER_STATUS_LABELS[item.status]}
          </span>
          <p className={`mt-1 text-[11px] ${longWait ? "font-semibold text-red-300" : "text-white/45"}`}>
            {formatWait(item.waitMinutes)}
          </p>
        </div>
      </div>

      {primary.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {primary.map((a) => (
            <form key={a.to} action={moveAction}>
              <input type="hidden" name="encounterId" value={item.id} />
              <input type="hidden" name="to" value={a.to} />
              <button disabled={moving} className={smallButton}>
                {a.label}
              </button>
            </form>
          ))}
        </div>
      )}

      {hasMore && (
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer text-white/50 hover:text-white">More options</summary>
          <div className="mt-2 space-y-2">
            {item.canTriage && (
              <form key={item.priority} action={priorityAction} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="encounterId" value={item.id} />
                <select name="priority" defaultValue={item.priority} className={smallSelect}>
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value} className="bg-neutral-900">
                      {p.label}
                    </option>
                  ))}
                </select>
                <input
                  name="reason"
                  placeholder="Reason (optional)"
                  className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-xs text-white placeholder:text-white/35"
                />
                <button disabled={savingPriority} className={smallButton}>
                  {savingPriority ? "Saving…" : "Set priority"}
                </button>
              </form>
            )}

            {canReassign && (
              <form action={reassignAction} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="encounterId" value={item.id} />
                <select name="doctorId" defaultValue="" required className={smallSelect}>
                  <option value="" disabled className="bg-neutral-900">
                    Move to…
                  </option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id} className="bg-neutral-900">
                      {d.name}
                      {d.onDuty ? "" : " (off duty)"}
                    </option>
                  ))}
                </select>
                <button disabled={reassigning} className={smallButton}>
                  {reassigning ? "Moving…" : "Reassign"}
                </button>
              </form>
            )}

            {secondary.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {secondary.map((a) => (
                  <form key={a.to} action={moveAction}>
                    <input type="hidden" name="encounterId" value={item.id} />
                    <input type="hidden" name="to" value={a.to} />
                    <button
                      disabled={moving}
                      onClick={(e) => {
                        if (!confirm(`${a.label}: ${item.patientName}?`)) e.preventDefault();
                      }}
                      className={dangerButton}
                    >
                      {a.label}
                    </button>
                  </form>
                ))}
              </div>
            )}
          </div>
        </details>
      )}

      {error && <p className="mt-2 text-xs text-red-200">{error}</p>}
    </li>
  );
}
