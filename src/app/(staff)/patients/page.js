import { Suspense } from "react";
import Link from "next/link";
import Form from "next/form";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/nav";
import { ageFrom, formatDate, formatSex, fullName } from "@/lib/patients";

export default function PatientsPage({ searchParams }) {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading patients…</p>}>
      <PatientList searchParams={searchParams} />
    </Suspense>
  );
}

async function PatientList({ searchParams }) {
  const session = await requirePermission("patients.read");
  const { q = "" } = await searchParams;
  const query = String(q).trim();

  // Every word must match somewhere: "Ade 0803" finds Ade with that phone
  const terms = query.split(/\s+/).filter(Boolean).slice(0, 4);
  const where = {
    deletedAt: null,
    AND: terms.map((t) => ({
      OR: [
        { hospitalNumber: { contains: t, mode: "insensitive" } },
        { firstName: { contains: t, mode: "insensitive" } },
        { lastName: { contains: t, mode: "insensitive" } },
        { otherNames: { contains: t, mode: "insensitive" } },
        { phone: { contains: t } },
      ],
    })),
  };

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        hospitalNumber: true,
        firstName: true,
        lastName: true,
        otherNames: true,
        sex: true,
        dateOfBirth: true,
        phone: true,
        createdAt: true,
      },
    }),
    prisma.patient.count({ where: { deletedAt: null } }),
  ]);

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patients</h1>
          <p className="mt-1 text-sm text-white/60">{total} registered</p>
        </div>
        {can(session.permissions, "patients.create") && (
          <Link
            href="/patients/new"
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-accent-hover"
          >
            Register patient
          </Link>
        )}
      </div>

      <Form action="/patients" className="mt-6 flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search by name, phone or hospital number"
          className="w-full max-w-md rounded-full border border-white/15 bg-black/30 px-5 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
        />
        <button className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm hover:bg-white/10">
          Search
        </button>
        {query && (
          <Link href="/patients" className="self-center text-sm text-white/60 hover:text-white">
            Clear
          </Link>
        )}
      </Form>

      {patients.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-sm text-white/60">
          {query ? `No patients match “${query}”.` : "No patients registered yet."}
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wider text-white/45">
              <tr>
                <th className="px-4 py-3 font-medium">Hospital no.</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Sex / Age</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {patients.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-mono text-xs text-white/80">{p.hospitalNumber}</td>
                  <td className="px-4 py-3">
                    <Link href={`/patients/${p.id}`} className="font-medium text-white hover:underline">
                      {fullName(p)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {formatSex(p.sex)} · {ageFrom(p.dateOfBirth)}y
                  </td>
                  <td className="px-4 py-3 text-white/70">{p.phone}</td>
                  <td className="px-4 py-3 text-xs text-white/55">{formatDate(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {patients.length === 50 && (
        <p className="mt-3 text-xs text-white/45">Showing the 50 most recent matches. Refine your search to narrow it down.</p>
      )}
    </div>
  );
}
