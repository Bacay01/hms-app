"use client";

import Link from "next/link";
import { useActionState } from "react";
import { cancelAppointment, checkIn } from "./actions";
import { markNoShow } from "./manage-actions";

const smallButton =
  "rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-white/80 hover:bg-white/10 disabled:opacity-60";
const dangerButton =
  "rounded-lg border border-accent/40 px-2.5 py-1.5 text-xs text-red-200 hover:bg-accent/15 disabled:opacity-60";

// canManage: booked + user can manage appointments. isPast: the appointment time has passed.
export default function AppointmentActions({ appointmentId, patientName, canCheckIn, canManage, isPast }) {
  const [checkInState, checkInAction, checkingIn] = useActionState(checkIn, {});
  const [cancelState, cancelAction, cancelling] = useActionState(cancelAppointment, {});
  const [noShowState, noShowAction, markingNoShow] = useActionState(markNoShow, {});

  if (!canCheckIn && !canManage) return null;
  const error = checkInState?.error || cancelState?.error || noShowState?.error;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
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
        {canManage && (
          <Link href={`/appointments/${appointmentId}/reschedule`} className={smallButton}>
            Reschedule
          </Link>
        )}
        {canManage && isPast && (
          <form action={noShowAction}>
            <input type="hidden" name="appointmentId" value={appointmentId} />
            <button
              disabled={markingNoShow}
              onClick={(e) => {
                if (!confirm(`Mark ${patientName} as a no-show?`)) e.preventDefault();
              }}
              className={smallButton}
            >
              {markingNoShow ? "…" : "No-show"}
            </button>
          </form>
        )}
        {canManage && (
          <form action={cancelAction}>
            <input type="hidden" name="appointmentId" value={appointmentId} />
            <button
              disabled={cancelling}
              onClick={(e) => {
                if (!confirm(`Cancel ${patientName}'s appointment?`)) e.preventDefault();
              }}
              className={dangerButton}
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
