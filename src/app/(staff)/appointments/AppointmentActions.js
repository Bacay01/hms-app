"use client";

import { useActionState } from "react";
import { cancelAppointment, checkIn } from "./actions";

export default function AppointmentActions({ appointmentId, patientName, canCheckIn, canCancel }) {
  const [checkInState, checkInAction, checkingIn] = useActionState(checkIn, {});
  const [cancelState, cancelAction, cancelling] = useActionState(cancelAppointment, {});

  if (!canCheckIn && !canCancel) return null;
  const error = checkInState?.error || cancelState?.error;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex justify-end gap-2">
        {canCheckIn && (
          <form action={checkInAction}>
            <input type="hidden" name="appointmentId" value={appointmentId} />
            <button
              disabled={checkingIn}
              className="rounded-lg bg-accent px-2.5 py-1.5 text-xs font-semibold hover:bg-accent-hover disabled:opacity-60"
            >
              {checkingIn ? "Checking in…" : "Check in"}
            </button>
          </form>
        )}
        {canCancel && (
          <form action={cancelAction}>
            <input type="hidden" name="appointmentId" value={appointmentId} />
            <button
              disabled={cancelling}
              onClick={(e) => {
                if (!confirm(`Cancel ${patientName}'s appointment?`)) e.preventDefault();
              }}
              className="rounded-lg border border-accent/40 px-2.5 py-1.5 text-xs text-red-200 hover:bg-accent/15 disabled:opacity-60"
            >
              {cancelling ? "…" : "Cancel"}
            </button>
          </form>
        )}
      </div>
      {error && <p className="text-xs text-red-200">{error}</p>}
      {checkInState?.success && <p className="text-xs text-white/70">{checkInState.success}</p>}
    </div>
  );
}
