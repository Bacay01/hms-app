import { Suspense } from "react";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, fullName } from "@/lib/patients";
import { localDate } from "@/lib/time";
import { endEnrolment, enrolPatient } from "../actions";
import { EndEnrolmentButton, EnrolForm } from "../HmoForms";

export default function EnrolmentsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading…</p>}>
      <Enrolments />
    </Suspense>
  );
}

async function Enrolments() {
  await requirePermission("hmo.manage");
  const today = localDate();
  const [plans, enrolments] = await Promise.all([
    prisma.hmoPlan.findMany({ where: { isActive: true, hmo: { isActive: true } }, orderBy: [{ hmo: { name: "asc" } }, { name: "asc" }], include: { hmo: true } }),
    prisma.patientHmo.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { patient: { select: { firstName: true, lastName: true, otherNames: true, hospitalNumber: true } }, plan: { include: { hmo: true } } },
    }),
  ]);

  return (
    <div className="max-w-5xl">
      <Link href="/hmo" className="text-sm text-white/60 hover:text-white">← HMO</Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Enrolments</h1>
      <p className="mt-1 text-sm text-white/60">A new enrolment replaces the patient&apos;s previous one. Their unpaid bills from the last 30 days are re-split straight away.</p>

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-sm font-semibold">Enrol a patient</h2>
        <div className="mt-3">
          {plans.length === 0 ? (
            <p className="text-sm text-white/55">Add an HMO and a plan first.</p>
          ) : (
            <EnrolForm action={enrolPatient} plans={plans.map((p) => ({ id: p.id, label: `${p.hmo.name} — ${p.name}` }))} />
          )}
        </div>
      </section>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wider text-white/45">
            <tr>
              <th className="px-4 py-3 font-medium">Patient</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Enrolment no.</th>
              <th className="px-4 py-3 font-medium">Valid until</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {enrolments.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-white/55">No active enrolments.</td></tr>
            )}
            {enrolments.map((e) => {
              const expired = e.validUntil && e.validUntil < today;
              return (
                <tr key={e.id}>
                  <td className="px-4 py-2.5">
                    {fullName(e.patient)} <span className="font-mono text-xs text-white/45">{e.patient.hospitalNumber}</span>
                  </td>
                  <td className="px-4 py-2.5 text-white/75">{e.plan.hmo.name} — {e.plan.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{e.enrolmentNumber}</td>
                  <td className={`px-4 py-2.5 ${expired ? "font-semibold text-red-200" : "text-white/70"}`}>
                    {e.validUntil ? `${formatDate(e.validUntil)}${expired ? " · EXPIRED" : ""}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right"><EndEnrolmentButton action={endEnrolment} enrolmentId={e.id} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
