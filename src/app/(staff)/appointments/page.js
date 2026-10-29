import { Suspense } from "react";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/nav";
import { fullName, hasKnownAllergies } from "@/lib/patients";
import {
  APPOINTMENT_STATUS_LABELS,
  REASSIGN_PERMISSIONS,
  TRIAGE_PERMISSIONS,
  VISIT_TYPES,
  allowedTransitions,
  canAny,
  labelOf,
} from "@/lib/queue";
import { EMPTY_QUEUE, groupQueueByDoctor } from "@/lib/queueBoard";
import { dayRange, localDate, localDayOfWeek, localTime, shiftDate } from "@/lib/time";
import QueueColumn from "./QueueColumn";
import AppointmentActions from "./AppointmentActions";
import AutoRefresh from "./AutoRefresh";
import UndoBar from "./UndoBar";
import { getUndoableAction } from "@/lib/undo";

export default function AppointmentsPage({ searchParams }) {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading…</p>}>
      <Board searchParams={searchParams} />
    </Suspense>
  );
}

const dayHeading = new Intl.DateTimeFormat("en-NG", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Lagos",
});

const patientSelect = {
  id: true,
  firstName: true,
  lastName: true,
  otherNames: true,
  hospitalNumber: true,
  allergies: true,
  isProvisional: true,
};

const STATUS_CHIP = {
  BOOKED: "bg-white/10 text-white/80",
  CHECKED_IN: "bg-accent/20 text-red-100",
  COMPLETED: "bg-white/5 text-white/50",
  CANCELLED: "bg-white/5 text-white/40 line-through",
  NO_SHOW: "bg-white/5 text-white/40",
};

async function Board({ searchParams }) {
  const session = await requirePermission("appointments.read");
  const params = await searchParams;
  const perms = session.permissions;

  const today = localDate();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? params.date : today;
  const isToday = date === today;
  const { start, end } = dayRange(date);
  const dow = localDayOfWeek(start);

  const [appointments, encounters, doctors] = await Promise.all([
    prisma.appointment.findMany({
      where: { scheduledAt: { gte: start, lt: end } },
      orderBy: { scheduledAt: "asc" },
      include: {
        patient: { select: patientSelect },
        doctor: { select: { lastName: true } },
        department: { select: { name: true } },
      },
    }),
    // No ORDER BY here — the TriageQueue (MinHeap) decides the calling order
    isToday
      ? prisma.encounter.findMany({
          where: { startedAt: { gte: start, lt: end } },
          include: { patient: { select: patientSelect } },
        })
      : [],
    prisma.user.findMany({
      where: { isActive: true, role: { name: "DOCTOR" } },
      orderBy: { firstName: "asc" },
      include: { department: { select: { name: true } }, schedules: true },
    }),
  ]);

  // The user's last move that can still be undone (Stack replayed from the audit log)
  const undoable = isToday ? await getUndoableAction(session.userId) : null;

  // One pass: Map(doctorId → queue), each doctor's patients ordered by the heap
  const byDoctor = groupQueueByDoctor(encounters);

  const now = Date.now();
  const isOnDuty = (d) => d.schedules.some((s) => s.dayOfWeek === dow);

  // On duty today, or already has patients today (Map.has is O(1))
  const onDuty = doctors.filter((d) => isOnDuty(d) || byDoctor.has(d.id));
  // Doctors see only their own queue
  const visibleDoctors = session.role === "DOCTOR" ? onDuty.filter((d) => d.id === session.userId) : onDuty;

  const reassignTargets = doctors.map((d) => ({
    id: d.id,
    name: `Dr ${d.firstName} ${d.lastName}`,
    onDuty: isOnDuty(d),
  }));

  const columns = visibleDoctors.map((d) => {
    const q = byDoctor.get(d.id) ?? EMPTY_QUEUE;
    const shift = d.schedules.find((s) => s.dayOfWeek === dow);

    return {
      id: d.id,
      name: `Dr ${d.firstName} ${d.lastName}`,
      department: d.department?.name ?? "No department",
      room: d.consultingRoom,
      hours: shift ? `${shift.startTime}–${shift.endTime}` : null,
      waiting: q.waiting,
      emergencies: q.emergencies,
      done: q.done,
      left: q.left,
      active: q.active.map((e) => ({
        id: e.id,
        queueNumber: e.queueNumber,
        status: e.status,
        priority: e.priority,
        visitType: e.visitType,
        reason: e.reason,
        patientId: e.patient.id,
        patientName: fullName(e.patient),
        hospitalNumber: e.patient.hospitalNumber,
        provisional: e.patient.isProvisional,
        allergy: hasKnownAllergies(e.patient.allergies) ? e.patient.allergies : null,
        waitMinutes: Math.max(0, Math.floor((now - e.startedAt.getTime()) / 60000)),
        actions: allowedTransitions(e.status, perms).map(({ to, label, confirm }) => ({
          to,
          label,
          confirm: Boolean(confirm),
        })),
        canTriage: canAny(perms, TRIAGE_PERMISSIONS),
        canReassign: ["WAITING", "WITH_NURSE"].includes(e.status) && canAny(perms, REASSIGN_PERMISSIONS),
      })),
    };
  });

  const navButton = "rounded-full border border-white/15 px-4 py-1.5 text-sm text-white/80 hover:bg-white/10";

  return (
    <div className="max-w-7xl">
      {isToday && <AutoRefresh />}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointments &amp; queue</h1>
          <p className="mt-1 text-sm text-white/60">
            {dayHeading.format(start)}
            {isToday && " · updates automatically"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isToday && can(perms, "encounters.create") && (
            <>
              <Link
                href="/appointments/emergency"
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-accent-hover"
              >
                Emergency check-in
              </Link>
              <Link href="/appointments/check-in" className="rounded-full border border-white/15 px-5 py-2.5 text-sm hover:bg-white/10">
                Walk-in check-in
              </Link>
            </>
          )}
          {can(perms, "appointments.manage") && (
            <Link href="/appointments/new" className="rounded-full border border-white/15 px-5 py-2.5 text-sm hover:bg-white/10">
              Book appointment
            </Link>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Link href={`/appointments?date=${shiftDate(date, -1)}`} className={navButton}>
          ← Previous day
        </Link>
        {!isToday && (
          <Link href="/appointments" className={navButton}>
            Today
          </Link>
        )}
        <Link href={`/appointments?date=${shiftDate(date, 1)}`} className={navButton}>
          Next day →
        </Link>
      </div>

      {isToday && <UndoBar action={undoable} />}

      {isToday && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Today&apos;s queue</h2>
          <p className="mt-1 text-xs text-white/45">
            Emergency and urgent patients are seen first. Wait times turn red after 2 hours.
          </p>
          {columns.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-sm text-white/60">
              {session.role === "DOCTOR" ? "You're not on duty today." : "No doctors are on duty today."}
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {columns.map((column) => (
                <QueueColumn
                  key={column.id}
                  column={column}
                  canCallNext={can(perms, "vitals.write")}
                  doctors={reassignTargets}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Appointments</h2>
        {appointments.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-sm text-white/60">
            No appointments booked for this day.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wider text-white/45">
                <tr>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Patient</th>
                  <th className="px-4 py-3 font-medium">Doctor</th>
                  <th className="px-4 py-3 font-medium">Visit</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {appointments.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-3 font-mono text-xs text-white/80">{localTime(a.scheduledAt)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/patients/${a.patient.id}`} className="font-medium hover:underline">
                        {fullName(a.patient)}
                      </Link>
                      <p className="font-mono text-xs text-white/45">{a.patient.hospitalNumber}</p>
                    </td>
                    <td className="px-4 py-3 text-white/75">
                      Dr {a.doctor.lastName}
                      <p className="text-xs text-white/45">{a.department?.name ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      {labelOf(VISIT_TYPES, a.visitType)}
                      <p className="text-xs text-white/45">{a.reason ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs ${STATUS_CHIP[a.status]}`}>
                        {APPOINTMENT_STATUS_LABELS[a.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <AppointmentActions
                        appointmentId={a.id}
                        patientName={fullName(a.patient)}
                        canCheckIn={isToday && a.status === "BOOKED" && can(perms, "encounters.create")}
                        canCancel={a.status === "BOOKED" && can(perms, "appointments.manage")}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
