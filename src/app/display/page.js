import { Suspense } from "react";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site";
import { buildCallHistory } from "@/lib/display";
import { groupQueueByDoctor } from "@/lib/queueBoard";
import { dayRange, localDate, localTime } from "@/lib/time";
import AutoRefresh from "@/app/(staff)/appointments/AutoRefresh";

export const metadata = { title: `Waiting room — ${SITE.name}` };

// Public waiting-room screen: queue numbers and rooms only — never patient names
export default function DisplayPage() {
  return (
    <main className="min-h-dvh bg-black text-white">
      <Suspense fallback={null}>
        <Screen />
      </Suspense>
    </main>
  );
}

async function Screen() {
  await connection(); // always live, never cached

  const { start, end } = dayRange(localDate());
  let encounters, doctors;
  try {
  [encounters, doctors] = await Promise.all([
    prisma.encounter.findMany({
      where: { startedAt: { gte: start, lt: end }, doctorId: { not: null } },
      select: { id: true, doctorId: true, status: true, priority: true, queueNumber: true, nurseAt: true, doctorAt: true },
    }),
    prisma.user.findMany({
      where: { isActive: true, role: { name: "DOCTOR" } },
      orderBy: { lastName: "asc" },
      select: { id: true, lastName: true, consultingRoom: true },
    }),
  ]);
  } catch (error) {
    console.error("Display: database unreachable", error);
    return <Reconnecting />;
  }

  const roomByDoctorId = new Map(doctors.map((d) => [d.id, d.consultingRoom ?? `Dr ${d.lastName}'s room`]));
  const { latest, recent } = buildCallHistory(encounters, roomByDoctorId, 6);

  // Same Map + TriageQueue grouping as the staff board
  const byDoctor = groupQueueByDoctor(encounters);
  const panels = doctors
    .filter((d) => byDoctor.has(d.id))
    .map((d) => {
      const q = byDoctor.get(d.id);
      return {
        id: d.id,
        name: `Dr ${d.lastName}`,
        room: d.consultingRoom,
        serving:
          q.active
            .filter((e) => e.status === "WITH_DOCTOR")
            .sort((a, b) => new Date(b.doctorAt) - new Date(a.doctorAt))[0]?.queueNumber ?? null,
        next: q.active.find((e) => e.status === "WAITING")?.queueNumber ?? null,
        waiting: q.waiting,
      };
    });

  return (
    <div className="flex min-h-dvh flex-col p-6 sm:p-10 lg:p-12">
      <AutoRefresh seconds={10} />

      <header className="flex items-center justify-between">
        <p className="text-2xl font-semibold tracking-tight">{SITE.name}</p>
        <p className="font-mono text-3xl tabular-nums text-white/80">{localTime()}</p>
      </header>

      <section className="mt-8 grid flex-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div
          className={`flex flex-col items-center justify-center rounded-[2rem] border p-10 text-center ${
            latest?.emergency ? "border-accent bg-accent/15" : "border-white/10 bg-white/[0.04]"
          }`}
        >
          <p className="text-lg uppercase tracking-[0.3em] text-white/60 sm:text-xl">Now calling</p>
          {latest ? (
            <>
              <p className="mt-6 font-mono text-[8rem] font-bold leading-none text-accent sm:text-[11rem] lg:text-[14rem]">
                {latest.number}
              </p>
              <p className="mt-6 text-3xl font-semibold sm:text-4xl lg:text-5xl">Please go to {latest.place}</p>
              {latest.emergency && <p className="mt-4 text-xl text-red-200">Emergency</p>}
            </>
          ) : (
            <p className="mt-8 text-2xl text-white/50 sm:text-3xl">Please wait to be called</p>
          )}
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
          <p className="text-lg uppercase tracking-[0.2em] text-white/50">Recently called</p>
          <ul className="mt-6 space-y-4">
            {recent.length === 0 ? (
              <li className="text-xl text-white/40">—</li>
            ) : (
              recent.map((c) => (
                <li key={c.id} className="flex items-baseline justify-between gap-4 border-b border-white/5 pb-3">
                  <span className={`font-mono text-4xl font-bold ${c.emergency ? "text-accent" : ""}`}>{c.number}</span>
                  <span className="text-right text-xl text-white/70">{c.place}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      {panels.length > 0 && (
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {panels.map((p) => (
            <div key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-5">
              <p className="text-xl font-semibold">
                {p.name}
                {p.room ? ` · ${p.room}` : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-white/70">
                <p>
                  Now <span className="ml-1 font-mono text-2xl font-bold text-white">{p.serving ?? "—"}</span>
                </p>
                <p>
                  Next <span className="ml-1 font-mono text-2xl font-bold text-white">{p.next ?? "—"}</span>
                </p>
                <p>
                  Waiting <span className="ml-1 font-mono text-2xl font-bold text-white">{p.waiting}</span>
                </p>
              </div>
            </div>
          ))}
        </section>
      )}

      <footer className="mt-6 text-center text-base text-white/40 sm:text-lg">
        Emergencies are seen first. Please listen for your number and the room shown.
      </footer>
    </div>
  );
}

// Shown if the database can't be reached — the screen keeps retrying every 10 seconds
function Reconnecting() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-10 text-center">
      <AutoRefresh seconds={10} />
      <p className="text-3xl font-semibold">{SITE.name}</p>
      <p className="text-xl text-white/60">Reconnecting… Please listen for your number.</p>
    </div>
  );
}
