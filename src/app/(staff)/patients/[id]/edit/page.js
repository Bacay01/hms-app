import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fullName } from "@/lib/patients";
import PatientForm from "../../PatientForm";
import { updatePatient } from "../../actions";

export default function EditPatientPage({ params }) {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading…</p>}>
      <EditPatient params={params} />
    </Suspense>
  );
}

async function EditPatient({ params }) {
  await requirePermission("patients.update");
  const { id } = await params;

  const patient = await prisma.patient.findFirst({ where: { id, deletedAt: null } });
  if (!patient) notFound();

  const today = new Date().toISOString().slice(0, 10);
  const defaults = {
    firstName: patient.firstName,
    lastName: patient.lastName,
    otherNames: patient.otherNames,
    dateOfBirth: patient.dateOfBirth.toISOString().slice(0, 10),
    sex: patient.sex,
    phone: patient.phone,
    email: patient.email,
    address: patient.address,
    nextOfKinName: patient.nextOfKinName,
    nextOfKinPhone: patient.nextOfKinPhone,
    nextOfKinRelation: patient.nextOfKinRelation,
    bloodGroup: patient.bloodGroup,
    genotype: patient.genotype,
    allergies: patient.allergies,
  };

  return (
    <div className="max-w-5xl">
      <Link href={`/patients/${patient.id}`} className="text-sm text-white/60 hover:text-white">
        ← {fullName(patient)}
      </Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">
        {patient.isProvisional ? "Complete patient details" : "Edit patient"}
      </h1>
      <p className="mt-1 font-mono text-sm text-white/60">{patient.hospitalNumber}</p>
      {patient.dobEstimated && (
        <p className="mt-2 text-sm text-white/60">
          The date of birth is currently an estimate. Replace it with the real date if known.
        </p>
      )}
      <div className="mt-6">
        <PatientForm
          action={updatePatient.bind(null, patient.id)}
          defaults={defaults}
          submitLabel="Save changes"
          cancelHref={`/patients/${patient.id}`}
          today={today}
          isEdit
          askConsent={!patient.consentGiven}
        />
      </div>
    </div>
  );
}
