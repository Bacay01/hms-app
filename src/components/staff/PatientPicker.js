import Link from "next/link";
import Form from "next/form";
import { prisma } from "@/lib/prisma";
import { fullName, patientSearchWhere } from "@/lib/patients";

// Step 1 of booking / check-in: find the patient, then continue with ?patientId=
export default async function PatientPicker({ q = "", basePath }) {
  const query = String(q).trim();
  const patients = query
    ? await prisma.patient.findMany({
        where: patientSearchWhere(query),
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, hospitalNumber: true, firstName: true, lastName: true, otherNames: true, phone: true },
      })
    : [];

  return (
    <div>
      <Form action={basePath} className="flex gap-2">
        <input
          name="q"
          defaultValue={query}
          autoFocus
          placeholder="Find the patient by name, phone or hospital number"
          className="w-full rounded-full border border-white/15 bg-black/30 px-5 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
        />
        <button className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm hover:bg-white/10">
          Search
        </button>
      </Form>

      {query &&
        (patients.length === 0 ? (
          <p className="mt-4 text-sm text-white/60">
            No patients match “{query}”.{" "}
            <Link href="/patients/new" className="font-medium text-white underline">
              Register a new patient
            </Link>
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10">
            {patients.map((p) => (
              <li key={p.id}>
                <Link
                  href={`${basePath}?patientId=${p.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-white/[0.04]"
                >
                  <span>
                    <span className="font-medium">{fullName(p)}</span>
                    <span className="ml-2 text-xs text-white/50">{p.phone}</span>
                  </span>
                  <span className="font-mono text-xs text-white/60">{p.hospitalNumber}</span>
                </Link>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
