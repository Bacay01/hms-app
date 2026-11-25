"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { cancelLabTest, collectSample, startTest } from "./actions";

const input =
  "rounded-lg border border-white/15 bg-black/30 px-3 py-1.5 text-xs text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none";
const primary = "rounded-full bg-accent px-4 py-1.5 text-xs font-semibold hover:bg-accent-hover disabled:opacity-60";
const secondary = "rounded-full border border-white/15 px-4 py-1.5 text-xs hover:bg-white/10 disabled:opacity-60";

export default function LabActions({ lab }) {
  const [collectState, collectAction, collecting] = useActionState(collectSample, {});
  const [startState, startAction, starting] = useActionState(startTest, {});
  const [cancelState, cancelAction, cancelling] = useActionState(cancelLabTest, {});
  const [showCancel, setShowCancel] = useState(false);

  const needsReason = lab.status === "REQUESTED" && lab.payment !== "PAID" && !lab.emergency;
  const message = collectState?.error || startState?.error || cancelState?.error;
  const success = collectState?.success || cancelState?.success;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {lab.status === "REQUESTED" && (
          <form action={collectAction} className="flex flex-wrap items-center justify-end gap-2">
            <input type="hidden" name="labRequestId" value={lab.id} />
            {needsReason && <input name="overrideReason" placeholder="Reason to go ahead unpaid" className={`${input} w-52`} />}
            <button disabled={collecting} className={primary}>
              {collecting ? "Collecting…" : "Collect sample"}
            </button>
          </form>
        )}

        {lab.status === "SAMPLE_COLLECTED" && (
          <form action={startAction}>
            <input type="hidden" name="labRequestId" value={lab.id} />
            <button disabled={starting} className={primary}>
              {starting ? "Starting…" : "Start test"}
            </button>
          </form>
        )}

        {(lab.status === "IN_PROGRESS" || lab.status === "RESULTED") && (
          <Link href={`/lab/${lab.id}`} className={primary}>
            {lab.status === "RESULTED" ? "Review results" : "Enter results"}
          </Link>
        )}

        {lab.status !== "RESULTED" && (
        <button type="button" onClick={() => setShowCancel((v) => !v)} className={secondary}>
          {showCancel ? "Keep" : "Cancel test"}
        </button>
        )}
      </div>

      {showCancel && (
        <form action={cancelAction} className="flex flex-wrap items-center justify-end gap-2">
          <input type="hidden" name="labRequestId" value={lab.id} />
          <input name="reason" placeholder="Why? e.g. haemolysed sample" className={`${input} w-60`} />
          <button disabled={cancelling} className={secondary}>
            {cancelling ? "…" : "Confirm cancel"}
          </button>
        </form>
      )}

      {message && <p className="text-right text-xs text-red-200">{message}</p>}
      {success && <p className="text-right text-xs text-white/70">{success}</p>}
    </div>
  );
}
