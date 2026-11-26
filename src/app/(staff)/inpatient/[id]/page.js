import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/nav";
import { bedChargeLines, dosesToday } from "@/lib/inpatient";
import { formatNaira } from "@/lib/money";
import { ageFrom, formatDateTime, formatSex, fullName, hasKnownAllergies } from "@/lib/patients";
import { FREQUENCIES, units } from "@/lib/prescribing";
import { dayRange, localDate } from "@/lib/time";
import { addNursingNote, dischargePatient, moveToBed, recordMedication } from "../actions";
import { BedPicker, DischargeForm, MedForm, NoteForm } from "../InpatientForms";

const freqLabel = (code) => FREQUENCIES.find((f) => f.code === code)?.label ?? code;

function Card({ title, children, action }) {
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

export default function AdmissionPage({ params }) {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading admission…</p>}>
      <Admission params={params} />
    </Suspense>
  );
}

async function Admission({ params }) {
  const session = await requirePermission("clinical.read");
  const { id } = await params;
  const canNurse = can(session.permissions, "vitals.write");
  const canDischarge = can(session.permissions, "clinical.write");
  const today = localDate();

  const admission = await prisma.admission.findUnique({
    where: { id },
    include: {
      patient: { select: { firstName: true, lastName: true, otherNames: true, hospitalNumber: true, sex: true, dateOfBirth: true, dobEstimated: true, allergies: true } },
      admittingDoctor: { select: { lastName: true } },
      dischargedBy: { select: { lastName: true } },
      occupiedBed: { include: { ward: { select: { name: true } } } },
      bedStays: { orderBy: { from: "asc" } },
      nursingNotes: { orderBy: { createdAt: "desc" }, take: 30, include: { author: { select: { firstName: true, lastName: true } } } },
      encounter: {
        select: {
          id: true,
          prescriptions: { where: { status: { not: "CANCELLED" } }, orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
  if (!admission) notFound();

  const onWard = admission.status === "ADMITTED";
  const { start } = dayRange(today);
  const [administrations, wards] = await Promise.all([
    prisma.medicationAdministration.findMany({
      where: { admissionId: id },
      orderBy: { givenAt: "desc" },
      include: { givenBy: { select: { firstName: true } } },
    }),
    onWard || admission.status === "AWAITING_BED"
      ? prisma.ward.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
          include: { beds: { where: { isActive: true, currentAdmissionId: null }, orderBy: { createdAt: "asc" }, select: { id: true, label: true } } },
        })
      : [],
  ]);

  const stays = admission.bedStays.map((s) => ({ id: s.id, wardName: s.wardName, rateKobo: s.rateKobo, fromDate: localDate(s.from), toDate: s.to ? localDate(s.to) : null }));
  const charges = bedChargeLines(stays, today);
  const bedTotal = charges.reduce((s, l) => s + l.rateKobo * l.nights, 0);

  return (
    <div className="max-w-6xl">
      <Link href="/inpatient" className="text-sm text-white/60 hover:text-white">← Inpatient</Link>

      <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{fullName(admission.patient)}</h1>
            <p className="mt-1 text-sm text-white/60">
              <span className="font-mono">{admission.patient.hospitalNumber}</span> · {formatSex(admission.patient.sex)} ·{" "}
              {admission.patient.dobEstimated ? "~" : ""}
              {ageFrom(admission.patient.dateOfBirth)} y · admitted by Dr {admission.admittingDoctor.lastName}
              {admission.admittedAt ? ` · on the ward since ${formatDateTime(admission.admittedAt)}` : ""}
            </p>
            {admission.reason && <p className="mt-1 text-sm text-white/70">Reason: {admission.reason}</p>}
          </div>
          <div className="text-right text-sm">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase text-white/80">{admission.status.replace("_", " ").toLowerCase()}</span>
            {admission.occupiedBed && (
              <p className="mt-2 font-medium">
                {admission.occupiedBed.ward.name} · {admission.occupiedBed.label}
              </p>
            )}
            <Link href={`/consultations/${admission.encounter.id}`} className="mt-1 block text-xs text-white/60 underline hover:text-white">
              Clinical record (notes, orders, vitals)
            </Link>
          </div>
        </div>
        {hasKnownAllergies(admission.patient.allergies) && (
          <p className="mt-3 rounded-xl border border-accent/40 bg-accent/15 px-3 py-2 text-sm text-red-100">
            <span className="font-semibold">Allergies:</span> {admission.patient.allergies}
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Card title="Medication chart">
            {admission.encounter.prescriptions.length === 0 ? (
              <p className="text-sm text-white/55">No prescriptions. The doctor prescribes from the clinical record.</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {admission.encounter.prescriptions.map((rx) => {
                  const mine = administrations.filter((a) => a.prescriptionId === rx.id);
                  const givenToday = mine.filter((a) => a.status === "GIVEN" && a.givenAt >= start).length;
                  const d = dosesToday(rx.frequency, givenToday);
                  return (
                    <li key={rx.id} className="py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{rx.drugName}</p>
                          <p className="text-xs text-white/60">
                            {units(rx.doseQty, rx.unit)} · {freqLabel(rx.frequency)} · {rx.status.toLowerCase()}
                          </p>
                          <p className={`text-xs ${d.remaining ? "text-red-200" : "text-white/55"}`}>
                            {d.given} of {d.expected} dose{d.expected === 1 ? "" : "s"} given today{d.remaining ? ` · ${d.remaining} still due` : " ✓"}
                          </p>
                        </div>
                        {onWard && canNurse && <MedForm action={recordMedication.bind(null, admission.id)} prescriptionId={rx.id} />}
                      </div>
                      {mine.length > 0 && (
                        <ul className="mt-2 space-y-0.5 text-xs text-white/50">
                          {mine.slice(0, 4).map((a) => (
                            <li key={a.id}>
                              {formatDateTime(a.givenAt)} · <span className={a.status === "GIVEN" ? "text-white/75" : "text-red-200"}>{a.status.toLowerCase()}</span> by {a.givenBy.firstName}
                              {a.note ? ` · ${a.note}` : ""}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title="Nursing notes">
            {onWard && canNurse && (
              <div className="mb-4">
                <NoteForm action={addNursingNote.bind(null, admission.id)} />
              </div>
            )}
            {admission.nursingNotes.length === 0 ? (
              <p className="text-sm text-white/55">No notes yet.</p>
            ) : (
              <ul className="space-y-3">
                {admission.nursingNotes.map((n) => (
                  <li key={n.id} className="text-sm">
                    <p className="whitespace-pre-wrap">{n.note}</p>
                    <p className="text-xs text-white/45">
                      {n.author.firstName} {n.author.lastName} · {formatDateTime(n.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {(admission.status === "AWAITING_BED" || onWard) && canNurse && (
            <Card title={onWard ? "Transfer" : "Admit to a bed"}>
              <BedPicker
                action={moveToBed.bind(null, admission.id)}
                wards={wards.map((w) => ({ name: w.name, beds: w.beds }))}
                label={onWard ? "Transfer" : "Admit to bed"}
              />
            </Card>
          )}

          <Card title="Bed charges so far">
            {charges.length === 0 ? (
              <p className="text-sm text-white/55">None yet.</p>
            ) : (
              <>
                <ul className="space-y-1 text-sm">
                  {charges.map((c) => (
                    <li key={c.stayId} className="flex justify-between gap-3">
                      <span className="text-white/70">
                        {c.wardName}: {c.nights} night{c.nights === 1 ? "" : "s"} × {formatNaira(c.rateKobo)}
                      </span>
                      <span>{formatNaira(c.rateKobo * c.nights)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 flex justify-between border-t border-white/10 pt-2 text-sm font-semibold">
                  <span>Total</span>
                  <span>{formatNaira(bedTotal)}</span>
                </p>
                <p className="mt-1 text-xs text-white/45">Added to the patient&apos;s bill automatically, one night at a time.</p>
              </>
            )}
          </Card>

          {onWard && canDischarge && (
            <Card title="Discharge">
              <DischargeForm action={dischargePatient.bind(null, admission.id)} />
            </Card>
          )}

          {admission.status === "DISCHARGED" && (
            <Card
              title="Discharged"
              action={
                <Link href={`/inpatient/${admission.id}/summary`} className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold hover:bg-accent-hover">
                  Discharge summary
                </Link>
              }
            >
              <p className="text-sm">
                {formatDateTime(admission.dischargedAt)} by Dr {admission.dischargedBy?.lastName}
              </p>
              <p className="mt-2 text-sm text-white/75">{admission.dischargeDiagnosis}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
