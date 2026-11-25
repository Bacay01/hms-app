import { Suspense } from "react";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime, fullName } from "@/lib/patients";
import { REMINDER_CONCURRENCY, tomorrowDate } from "@/lib/reminders";
import { dayRange } from "@/lib/time";
import RunButton from "./RunButton";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STATUS = {
  SENT: { label: "Sent", style: "bg-white/15 text-white" },
  FAILED: { label: "Failed", style: "border border-accent/50 text-red-200" },
  SKIPPED: { label: "Skipped", style: "border border-white/20 text-white/60" },
};

export default function RemindersPage({ searchParams }) {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading…</p>}>
      <Reminders searchParams={searchParams} />
    </Suspense>
  );
}

async function Reminders({ searchParams }) {
  await requirePermission("appointments.manage");
  const { date: requested = "" } = await searchParams;
  const date = DATE_RE.test(String(requested)) ? String(requested) : tomorrowDate();
  const { start, end } = dayRange(date);

  const appointments = await prisma.appointment.findMany({
    where: { scheduledAt: { gte: start, lt: end }, status: "BOOKED" },
    orderBy: { scheduledAt: "asc" },
    include: {
      patient: { select: { firstName: true, lastName: true, otherNames: true, hospitalNumber: true } },
      doctor: { select: { lastName: true } },
      reminders: { where: { kind: "DAY_BEFORE" } },
    },
  });

  return (
    <div className="max-w-5xl">
      <Link href="/appointments" className="text-sm text-white/60 hover:text-white">← Appointments</Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointment reminders</h1>
          <p className="mt-1 text-sm text-white/60">
            SMS the day before · {date} · {appointments.length} booked · sends {REMINDER_CONCURRENCY} at a time, up to 3 tries each
          </p>
        </div>
        <form className="flex gap-2">
          <input
            type="date"
            name="date"
            defaultValue={date}
            className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white [color-scheme:dark]"
          />
          <button className="rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/10">Show</button>
        </form>
      </div>

      <div className="mt-6">
        <RunButton date={date} concurrency={REMINDER_CONCURRENCY} />
      </div>

      {appointments.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-sm text-white/60">
          No booked appointments on {date}.
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wider text-white/45">
              <tr>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Patient</th>
                <th className="px-4 py-3 font-medium">Doctor</th>
                <th className="px-4 py-3 font-medium">Reminder</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {appointments.map((a) => {
                const r = a.reminders[0];
                return (
                  <tr key={a.id}>
                    <td className="px-4 py-3">{formatDateTime(a.scheduledAt)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{fullName(a.patient)}</p>
                      <p className="font-mono text-xs text-white/45">{a.patient.hospitalNumber}</p>
                    </td>
                    <td className="px-4 py-3 text-white/70">Dr {a.doctor.lastName}</td>
                    <td className="px-4 py-3">
                      {r ? (
                        <>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS[r.status].style}`}>
                            {STATUS[r.status].label}
                          </span>
                          <p className="mt-1 text-xs text-white/50">
                            {r.toPhoneMasked ?? "no number"} · {r.attempts} attempt{r.attempts === 1 ? "" : "s"}
                            {r.error ? ` · ${r.error}` : ""}
                          </p>
                        </>
                      ) : (
                        <span className="text-xs text-white/45">Not sent yet</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
