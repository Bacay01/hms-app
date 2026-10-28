import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { can } from "@/lib/nav";
import { ageFrom, formatDate, formatDateTime, formatSex, fullName, hasKnownAllergies } from "@/lib/patients";

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

async function PatientProfile({ params }) {
  const session = await requirePermission("patients.read");
  const { id } = await params;

  const patient = await prisma.patient.findFirst({
    where: { id, deletedAt: null },
    include: {
      registeredBy: { select: { firstName: true, lastName: true } },
      encounters: {
        orderBy: { startedAt: "desc" },
        take: 20,
        include: { doctor: { select: { firstName: true, lastName: true } } },
      },
    },
  });
  if (!patient) notFound();

  await audit({ action: "patient.view", entity: "Patient", entityId: patient.id, userId: session.userId });

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
            {formatSex(patient.sex)} · {ageFrom(patient.dateOfBirth)} years
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/patients/${patient.id}/card`}
            className="rounded-full border border-white/15 px-5 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            Print card
          </Link>
          {can(session.permissions, "patients.update") && (
            <Link
              href={`/patients/${patient.id}/edit`}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold hover:bg-accent-hover"
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      {hasKnownAllergies(patient.allergies) && (
        <div className="mt-6 rounded-2xl border border-accent/40 bg-accent/15 px-5 py-3 text-sm">
          <span className="font-semibold text-white">Allergies: </span>
          <span className="text-red-100">{patient.allergies}</span>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Personal details">
          <Detail label="Date of birth" value={formatDate(patient.dateOfBirth)} />
          <Detail label="Sex" value={formatSex(patient.sex)} />
          <Detail label="Blood group" value={patient.bloodGroup} />
          <Detail label="Genotype" value={patient.genotype} />
          <Detail label="Allergies" value={hasKnownAllergies(patient.allergies) ? patient.allergies : "None known"} />
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
          <Detail
            label="Registered by"
            value={`${patient.registeredBy.firstName} ${patient.registeredBy.lastName}`}
          />
          <Detail label="Registered on" value={formatDateTime(patient.createdAt)} />
          <Detail label="Consent" value={patient.consentGiven ? `Given ${formatDateTime(patient.consentAt)}` : "Not recorded"} />
          <Detail label="Last updated" value={formatDateTime(patient.updatedAt)} />
        </Card>
      </div>

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-sm font-semibold">Visits</h2>
        {patient.encounters.length === 0 ? (
          <p className="mt-3 text-sm text-white/55">No visits yet. Check-in arrives in Phase 3.</p>
        ) : (
          <ul className="mt-3 divide-y divide-white/5">
            {patient.encounters.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span>{formatDateTime(e.startedAt)}</span>
                <span className="text-white/60">
                  {e.doctor ? `Dr ${e.doctor.lastName}` : "Unassigned"} · {e.status.replaceAll("_", " ").toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
