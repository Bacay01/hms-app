"use client";

import { startTransition, useActionState } from "react";
import { addLeave, removeLeave, updateDoctorProfile, updateWeeklySchedule } from "../../schedule-actions";
import { DAY_NAMES } from "@/lib/time";

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first
const input =
  "w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none";
const primaryButton =
  "rounded-full bg-accent px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-accent-hover disabled:opacity-60";

// Submit manually so React doesn't reset the form after saving
function submitWith(formAction) {
  return (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  };
}

function Status({ state }) {
  if (state?.error) return <p className="text-sm text-red-200">{state.error}</p>;
  if (state?.success) return <p className="text-sm text-white/75">{state.success}</p>;
  return null;
}

function Section({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <h2 className="font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-white/55">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function LeaveRow({ leave }) {
  const [state, action, pending] = useActionState(removeLeave, {});
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
      <div>
        <p className="font-medium">
          {leave.startDate === leave.endDate ? leave.startDate : `${leave.startDate} → ${leave.endDate}`}
        </p>
        <p className="text-xs text-white/50">
          {leave.reason ?? "No reason given"}
          {leave.booked > 0 && (
            <span className="ml-2 text-red-200">
              · {leave.booked} booked appointment(s) to reschedule
            </span>
          )}
        </p>
        {state?.error && <p className="text-xs text-red-200">{state.error}</p>}
      </div>
      <form action={action}>
        <input type="hidden" name="leaveId" value={leave.id} />
        <button
          disabled={pending}
          onClick={(e) => {
            if (!confirm("Remove this leave?")) e.preventDefault();
          }}
          className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs text-red-200 hover:bg-accent/15 disabled:opacity-60"
        >
          {pending ? "…" : "Remove"}
        </button>
      </form>
    </li>
  );
}

export default function ScheduleEditor({ doctor, departments, leaves, today }) {
  const [profileState, profileAction, savingProfile] = useActionState(updateDoctorProfile.bind(null, doctor.id), {});
  const [weekState, weekAction, savingWeek] = useActionState(updateWeeklySchedule.bind(null, doctor.id), {});
  const [leaveState, leaveAction, savingLeave] = useActionState(addLeave.bind(null, doctor.id), {});

  return (
    <div className="mt-6 space-y-6">
      <Section title="Department and room">
        <form onSubmit={submitWith(profileAction)} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-white/75">Department</span>
            <select name="departmentId" defaultValue={doctor.departmentId ?? ""} className={input}>
              <option value="" className="bg-neutral-900">No department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id} className="bg-neutral-900">
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-white/75">Consulting room</span>
            <input name="consultingRoom" defaultValue={doctor.consultingRoom ?? ""} placeholder="e.g. Room 4" className={input} />
          </label>
          <button disabled={savingProfile} className={primaryButton}>
            {savingProfile ? "Saving…" : "Save"}
          </button>
        </form>
        <div className="mt-3">
          <Status state={profileState} />
        </div>
      </Section>

      <Section title="Weekly hours" description="Tick the days this doctor works and set their hours (Lagos time).">
        <form onSubmit={submitWith(weekAction)} className="space-y-3">
          {WEEK_ORDER.map((d) => {
            const shift = doctor.schedules.find((s) => s.dayOfWeek === d);
            return (
              <div key={d} className="grid grid-cols-[130px_1fr_1fr] items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name={`day-${d}-on`}
                    defaultChecked={Boolean(shift)}
                    className="size-4 accent-[#e5262a]"
                  />
                  {DAY_NAMES[d]}
                </label>
                <input
                  type="time"
                  name={`day-${d}-start`}
                  defaultValue={shift?.startTime ?? "09:00"}
                  className={`${input} [color-scheme:dark]`}
                />
                <input
                  type="time"
                  name={`day-${d}-end`}
                  defaultValue={shift?.endTime ?? "17:00"}
                  className={`${input} [color-scheme:dark]`}
                />
              </div>
            );
          })}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button disabled={savingWeek} className={primaryButton}>
              {savingWeek ? "Saving…" : "Save weekly hours"}
            </button>
            <Status state={weekState} />
          </div>
        </form>
      </Section>

      <Section title="Leave" description="Days this doctor is away. They won't appear as on duty, and can't be booked.">
        <form onSubmit={submitWith(leaveAction)} className="grid gap-4 sm:grid-cols-[1fr_1fr_1.5fr_auto] sm:items-end">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-white/75">From</span>
            <input type="date" name="startDate" min={today} required className={`${input} [color-scheme:dark]`} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-white/75">To</span>
            <input type="date" name="endDate" min={today} required className={`${input} [color-scheme:dark]`} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-white/75">Reason (optional)</span>
            <input name="reason" placeholder="e.g. Annual leave" className={input} />
          </label>
          <button disabled={savingLeave} className={primaryButton}>
            {savingLeave ? "Adding…" : "Add leave"}
          </button>
        </form>
        <div className="mt-3">
          <Status state={leaveState} />
        </div>

        {leaves.length === 0 ? (
          <p className="mt-4 text-sm text-white/50">No upcoming leave.</p>
        ) : (
          <ul className="mt-4 divide-y divide-white/5">
            {leaves.map((leave) => (
              <LeaveRow key={leave.id} leave={leave} />
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
