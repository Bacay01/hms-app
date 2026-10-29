import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { can } from "@/lib/nav";
import { ageFrom, formatDateTime, formatSex, fullName, hasKnownAllergies } from "@/lib/patients";
import { ACTIVE_STATUSES, ENCOUNTER_STATUS_LABELS, PRIORITIES, VISIT_TYPES, labelOf } from "@/lib/queue";
import { assessVitals, bmi } from "@/lib/vitals";
import { recordVitals } from "../actions";
import VitalsForm from "./VitalsForm";

export default function ConsultationPage({ params }) {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading visit…</p>}>
      <Consultation params={params} />
    </Suspense>
  );
}

const LEVEL_STYLE = {
  critical: "bg-accent text-white",
  high: "border border-accent/60 text-red-200",
  low: "border border-accent/60 text-red-200",
};

function Card({ title, action, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Reading({ label, value, flagged }) {
  return (
    <div>
      <p className="text-[11px] text-white/45">{label}</p>
      <p className={`text-lg font-semibold ${flagged ? "text-red-300" : "text-white"}`}>{value ?? "—"}</p>
    </div>
  );
}

async function Consultation({ params }) {
  const session = await requirePermission("clinical.read");
  const { id } = await params;

  const encounter = await prisma.encounter.findUnique({
    where: { id },
    include: {
      patient: true,
      doctor: { select: { firstName: true, lastName: true, consultingRoom: true } },
    },
  });
  if (!encounter) notFound();

  // Doctors only open their own patients' visits
  if (session.role === "DOCTOR" && encounter.doctorId !== session.userId) notFound();

  const history = await prisma.vitals.findMany({
    where: { patientId: encounter.patientId },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { recordedBy: { select: { firstName: true, lastName: true } } },
  });

  await audit({ action: "encounter.view", entity: "Encounter", entityId: encounter.id, userId: session.userId });

  const p = encounter.patient;
  const age = ageFrom(p.dateOfBirth);
  const latest = history.find((v) => v.encounterId === encounter.id) ?? null;
  const assessment = latest ? assessVitals(latest, age) : null;
  const flagged = new Set(assessment?.flags.map((f) => f.field) ?? []);
  const latestBmi = latest ? bmi(latest.weightKg, latest.heightCm) : null;
  const active = ACTIVE_STATUSES.includes(encounter.status);
  const canRecord = active && can(session.permissions, "vitals.write");

  return (
    <div className="max-w-6xl">
      <Link href="/consultations" className="text-sm text-white/60 hover:text-white">← Consultations</Link>

      {/* Patient banner */}
      <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{fullName(p)}</h1>
              {encounter.priority !== "NORMAL" && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${
                    encounter.priority === "EMERGENCY" ? "bg-accent text-white" : "border border-accent/60 text-red-200"
                  }`}
                >
                  {labelOf(PRIORITIES, encounter.priority)}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-white/60">
              <span className="font-mono">{p.hospitalNumber}</span> · {formatSex(p.sex)} · {p.dobEstimated ? "~" : ""}
              {age} years · Blood {p.bloodGroup ?? "—"} · Genotype {p.genotype ?? "—"}
            </p>
            <p className="mt-1 text-sm text-white/60">
              Queue #{encounter.queueNumber} · {labelOf(VISIT_TYPES, encounter.visitType)}
              {encounter.reason ? ` · ${encounter.reason}` : ""}
            </p>
          </div>
          <div className="text-right text-sm">
            <span className="rounded-full bg-white/10 px-3 py-1 text-white/85">{ENCOUNTER_STATUS_LABELS[encounter.status]}</span>
            <p className="mt-2 text-white/55">
              {encounter.doctor ? `Dr ${encounter.doctor.lastName}` : "Unassigned"}
              {encounter.doctor?.consultingRoom ? ` · ${encounter.doctor.consultingRoom}` : ""}
            </p>
            <Link href={`/patients/${p.id}`} className="mt-1 inline-block text-xs text-white/60 underline hover:text-white">
              Full patient record
            </Link>
          </div>
        </div>

        {hasKnownAllergies(p.allergies) && (
          <div className="mt-4 rounded-xl border border-accent/40 bg-accent/15 px-4 py-2.5 text-sm">
            <span className="font-semibold">Allergies: </span>
            <span className="text-red-100">{p.allergies}</span>
          </div>
        )}
        {p.isProvisional && (
          <p className="mt-3 text-sm text-red-200">Unidentified emergency patient — details still to be completed.</p>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card
            title="Vitals — this visit"
            action={latest && <span className="text-xs text-white/45">{formatDateTime(latest.createdAt)}</span>}
          >
            {!latest ? (
              <p className="text-sm text-white/55">No vitals recorded for this visit yet.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Reading
                    label="Blood pressure"
                    value={latest.systolic ? `${latest.systolic}/${latest.diastolic}` : null}
                    flagged={flagged.has("bp")}
                  />
                  <Reading label="Temperature" value={latest.temperature && `${latest.temperature} °C`} flagged={flagged.has("temperature")} />
                  <Reading label="Pulse" value={latest.pulse && `${latest.pulse} bpm`} flagged={flagged.has("pulse")} />
                  <Reading label="Resp. rate" value={latest.respiratoryRate && `${latest.respiratoryRate}/min`} flagged={flagged.has("respiratoryRate")} />
                  <Reading label="SpO₂" value={latest.spo2 && `${latest.spo2}%`} flagged={flagged.has("spo2")} />
                  <Reading label="Weight" value={latest.weightKg && `${latest.weightKg} kg`} />
                  <Reading label="BMI" value={latestBmi && `${latestBmi.value} (${latestBmi.category})`} />
                  <Reading label="Glucose" value={latest.glucose && `${latest.glucose} mmol/L`} flagged={flagged.has("glucose")} />
                </div>

                {assessment.paediatric ? (
                  <p className="mt-4 text-xs text-white/50">
                    Paediatric patient: adult reference ranges don&apos;t apply, so readings are not flagged.
                  </p>
                ) : assessment.flags.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {assessment.flags.map((f) => (
                      <span key={f.field} className={`rounded-full px-2.5 py-1 text-xs font-medium ${LEVEL_STYLE[f.level]}`}>
                        {f.message}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-white/50">No readings outside adult screening ranges.</p>
                )}
                {latest.notes && <p className="mt-3 text-sm text-white/65">Note: {latest.notes}</p>}
              </>
            )}
          </Card>

          {canRecord && (
            <Card title="Record vitals">
              <VitalsForm action={recordVitals.bind(null, encounter.id)} />
            </Card>
          )}

          <Card title="Readings history">
            {history.length === 0 ? (
              <p className="text-sm text-white/55">No previous readings.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead className="text-white/45">
                    <tr>
                      <th className="py-2 pr-3 font-medium">When</th>
                      <th className="py-2 pr-3 font-medium">BP</th>
                      <th className="py-2 pr-3 font-medium">Temp</th>
                      <th className="py-2 pr-3 font-medium">Pulse</th>
                      <th className="py-2 pr-3 font-medium">SpO₂</th>
                      <th className="py-2 pr-3 font-medium">Weight</th>
                      <th className="py-2 pr-3 font-medium">Glucose</th>
                      <th className="py-2 font-medium">By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {history.map((v) => (
                      <tr key={v.id} className={v.encounterId === encounter.id ? "text-white" : "text-white/65"}>
                        <td className="py-2 pr-3">
                          {formatDateTime(v.createdAt)}
                          {v.encounterId === encounter.id && <span className="ml-1 text-white/40">(this visit)</span>}
                        </td>
                        <td className="py-2 pr-3">{v.systolic ? `${v.systolic}/${v.diastolic}` : "—"}</td>
                        <td className="py-2 pr-3">{v.temperature ?? "—"}</td>
                        <td className="py-2 pr-3">{v.pulse ?? "—"}</td>
                        <td className="py-2 pr-3">{v.spo2 ? `${v.spo2}%` : "—"}</td>
                        <td className="py-2 pr-3">{v.weightKg ?? "—"}</td>
                        <td className="py-2 pr-3">{v.glucose ?? "—"}</td>
                        <td className="py-2">{v.recordedBy.firstName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Clinical notes & diagnosis">
            <p className="text-sm text-white/55">Coming in 4B: versioned notes and diagnosis autocomplete.</p>
          </Card>
          <Card title="Prescriptions & lab requests">
            <p className="text-sm text-white/55">Coming in 4C: prescriptions with interaction checks, and lab requests.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
