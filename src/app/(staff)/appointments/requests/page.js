import { Suspense } from "react";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/patients";
import { TIME_SLOTS, requestReference, localPhone } from "@/lib/bookingRequest";
import RequestActions from "./RequestActions";

const TABS = { NEW: "Waiting for a call", BOOKED: "Booked", DECLINED: "Declined" };

export default function RequestsPage({ searchParams }) {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading…</p>}>
      <Requests searchParams={searchParams} />
    </Suspense>
  );
}

const dateOnly = (d) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(d);

async function Requests({ searchParams }) {
  await requirePermission("appointments.manage");
  const { status: requested = "NEW" } = await searchParams;
  const status = Object.hasOwn(TABS, requested) ? requested : "NEW";

  const [requests, counts, departments] = await Promise.all([
    prisma.appointmentRequest.findMany({
      where: { status },
      // Oldest first while waiting (fair queue); newest first once handled
      orderBy: { createdAt: status === "NEW" ? "asc" : "desc" },
      take: 100,
    }),
    prisma.appointmentRequest.groupBy({ by: ["status"], _count: true }),
    prisma.department.findMany({ select: { id: true, name: true } }),
  ]);
  const count = Object.fromEntries(counts.map((c) => [c.status, c._count]));
  const deptName = new Map(departments.map((d) => [d.id, d.name]));

  return (
    <div className="max-w-5xl">
      <Link href="/appointments" className="text-sm text-white/60 hover:text-white">← Appointments</Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Appointment requests</h1>
      <p className="mt-1 text-sm text-white/60">
        Sent from the public website. Call the patient, book the real appointment, then mark the request as booked.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {Object.entries(TABS).map(([key, label]) => (
          <Link
            key={key}
            href={key === "NEW" ? "/appointments/requests" : `/appointments/requests?status=${key}`}
            className={`rounded-full px-4 py-1.5 text-sm ${
              key === status ? "bg-white text-black" : "border border-white/15 text-white/80 hover:bg-white/10"
            }`}
          >
            {label} · {count[key] ?? 0}
          </Link>
        ))}
      </div>

      {requests.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-sm text-white/60">
          {status === "NEW" ? "No one is waiting for a call back." : `No ${TABS[status].toLowerCase()} requests.`}
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {requests.map((r) => {
            const phone = localPhone(r.phone);
            return (
              <li key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold">{r.fullName}</p>
                    <p className="mt-0.5 text-sm text-white/70">
                      <a href={`tel:${r.phone}`} className="underline decoration-white/30 underline-offset-2 hover:text-white">{phone}</a>
                      <span className="text-white/40"> · {requestReference(r.id)} · sent {formatDateTime(r.createdAt)}</span>
                    </p>
                  </div>
                  <p className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/80">
                    {dateOnly(r.preferredDate)} · {TIME_SLOTS[r.preferredTime]?.split(" (")[0] ?? r.preferredTime}
                  </p>
                </div>

                <dl className="mt-3 grid gap-1 text-sm sm:grid-cols-[120px_1fr]">
                  <dt className="text-white/45">Department</dt>
                  <dd>{r.departmentId ? deptName.get(r.departmentId) ?? "—" : "Not sure"}</dd>
                  {r.reason && (
                    <>
                      <dt className="text-white/45">Note</dt>
                      <dd className="whitespace-pre-wrap text-white/80">{r.reason}</dd>
                    </>
                  )}
                  {r.staffNote && (
                    <>
                      <dt className="text-white/45">Staff note</dt>
                      <dd className="text-white/80">{r.staffNote}</dd>
                    </>
                  )}
                </dl>

                {status === "NEW" && (
                  <div className="mt-4 flex flex-wrap items-start gap-2">
                    <Link
                      href={`/appointments/new?q=${encodeURIComponent(phone)}`}
                      className="rounded-full bg-accent px-4 py-2 text-sm font-semibold hover:bg-accent-hover"
                    >
                      Find patient &amp; book →
                    </Link>
                    <RequestActions id={r.id} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
