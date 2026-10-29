import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { can } from "@/lib/nav";
import { ageFrom, formatDate, formatDateTime, formatSex, fullName, hasKnownAllergies } from "@/lib/patients";
import { ENCOUNTER_STATUS_LABELS, PRIORITIES, VISIT_TYPES, labelOf } from "@/lib/queue";

export default function PatientPage({ params }) {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading patient…</p>}>
      <PatientProfile params={params} />
    </Suspense>
  );
}

function Card({ title, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function Detail({ label, value, highlight = false }) {
  return (
    <div>
      <dt className="text-xs text-white/45">{label}</dt>
      <dd className={`mt-0.5 text-sm ${highlight ? "font-medium text-red-200" : "text-white"}`}>{value || "—"}</dd>
    </div>
  );
}

const outlineButton = "rounded-full border border-white/15 px-5 py-2 text-sm text-white/80 hover:bg-white/10";

async function PatientProfile({ params }) {
  const session = await requirePermission("patients.read");
  const perms = session.permissions;
  const { id } = await params;

  const patient = await prisma.patient.findFirst({
    where: { id, deletedAt: null },
    include: {
      registeredBy: { select: { firstName: true, lastName: true } },
      encounters: {
        orderBy: { startedAt: "desc" },
        take: 20,
        include: { doctor: { select: { lastName: true } } },
      },
    },
  });
  if (!patient) notFound();

  await audit({ action: "patient.view", entity: "Patient", entityId: patient.id, userId: session.userId });

  const allergic = hasKnownAllergies(patient.allergies);
  const canEdit = can(perms, "patients.update");
  const age = `${patient.dobEstimated ? "~" : ""}${ageFrom(patient.dateOfBirth)} years`;
  const dob = patient.dobEstimated
    ? `Estimated (born ~${patient.dateOfBirth.getUTCFullYear()})`
    : formatDate(patient.dateOfBirth);

  return (
    <div className="max-w-5xl">
      <Link href="/patients" className="text-sm text-white/60 hover:text-white">← Patients</Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{fullName(patient)}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white/60">
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-mono text-xs text-white">
              {patient.hospitalNumber}
            </span>
            {formatSex(patient.sex)} · {age}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {can(perms, "encounters.create") && (
            <Link href={`/appointments/check-in?patientId=${patient.id}`} className={outlineButton}>
              Check in
            </Link>
          )}
          {can(perms, "appointments.manage") && (
            <Link href={`/appointments/new?patientId=${patient.id}`} className={outlineButton}>
              Book appointment
            </Link>
          )}
          <Link href={`/patients/${patient.id}/card`} className={outlineButton}>
            Print card
          </Link>
          {canEdit && (
            <Link
              href={`/patients/${patient.id}/edit`}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold hover:bg-accent-hover"
            >
              {patient.isProvisional ? "Complete details" : "Edit"}
            </Link>
          )}
        </div>
      </div>

      {patient.isProvisional && (
        <div className="mt-6 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm">
          <span className="font-semibold">Temporary emergency record.</span>{" "}
          <span className="text-white/75">
            Complete this patient&apos;s details and record their consent once they can be identified.
          </span>
        </div>
      )}

      {allergic && (
        <div className="mt-4 rounded-2xl border border-accent/40 bg-accent/15 px-5 py-3 text-sm">
          <span className="font-semibold text-white">Allergies: </span>
          <span className="text-red-100">{patient.allergies}</span>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Personal details">
          <Detail label="Date of birth" value={dob} />
          <Detail label="Sex" value={formatSex(patient.sex)} />
          <Detail label="Blood group" value={patient.bloodGroup} />
          <Detail label="Genotype" value={patient.genotype} />
          <Detail label="Allergies" value={allergic ? patient.allergies : "None known"} highlight={allergic} />
        </Card>

        <Card title="Contact">
          <Detail label="Phone" value={patient.phone} />
          <Detail label="Email" value={patient.email} />
          <div className="sm:col-span-2">
            <Detail label="Address" value={patient.address} />
          </div>
        </Card>

        <Card title="Next of kin">
          <Detail label="Name" value={patient.nextOfKinName} />
          <Detail label="Relationship" value={patient.nextOfKinRelation} />
          <Detail label="Phone" value={patient.nextOfKinPhone} />
        </Card>

        <Card title="Registration">
          <Detail label="Registered by" value={`${patient.registeredBy.firstName} ${patient.registeredBy.lastName}`} />
          <Detail label="Registered on" value={formatDateTime(patient.createdAt)} />
          <Detail
            label="Consent"
            value={patient.consentGiven ? `Given ${formatDateTime(patient.consentAt)}` : "Not yet recorded"}
            highlight={!patient.consentGiven}
          />
          <Detail label="Last updated" value={formatDateTime(patient.updatedAt)} />
        </Card>
      </div>

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-sm font-semibold">Visits</h2>
        {patient.encounters.length === 0 ? (
          <p className="mt-3 text-sm text-white/55">No visits yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-white/5">
            {patient.encounters.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span>
                  {formatDateTime(e.startedAt)}
                  <span className="ml-2 text-xs text-white/50">
                    {labelOf(VISIT_TYPES, e.visitType)}
                    {e.reason ? ` · ${e.reason}` : ""}
                  </span>
                </span>
                <span className="flex items-center gap-2 text-white/60">
                  {e.priority !== "NORMAL" && (
                    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[11px] text-red-100">
                      {labelOf(PRIORITIES, e.priority)}
                    </span>
                  )}
                  {e.doctor ? `Dr ${e.doctor.lastName}` : "Unassigned"} · {ENCOUNTER_STATUS_LABELS[e.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
