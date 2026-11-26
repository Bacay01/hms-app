import { Suspense } from "react";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/nav";
import { formatDateTime, fullName } from "@/lib/patients";
import { daysUntil } from "@/lib/stock";
import { localDate } from "@/lib/time";
import { moveToBed } from "./actions";
import { BedPicker } from "./InpatientForms";

export default function InpatientPage() {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading wards…</p>}>
      <Inpatient />
    </Suspense>
  );
}

async function Inpatient() {
  const session = await requirePermission("clinical.read");
  const canMove = can(session.permissions, "vitals.write");
  const canSetup = can(session.permissions, "staff.manage");
  const today = localDate();

  const [wards, awaiting] = await Promise.all([
    prisma.ward.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        beds: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
          include: { currentAdmission: { select: { id: true, admittedAt: true, patient: { select: { firstName: true, lastName: true, otherNames: true } } } } },
        },
      },
    }),
    prisma.admission.findMany({
      where: { status: "AWAITING_BED" },
      orderBy: { createdAt: "asc" },
      include: { patient: { select: { firstName: true, lastName: true, otherNames: true, hospitalNumber: true } }, admittingDoctor: { select: { lastName: true } } },
    }),
  ]);

  const freeByWard = wards.map((w) => ({ name: w.name, beds: w.beds.filter((b) => !b.currentAdmission).map((b) => ({ id: b.id, label: b.label })) }));
  const totalBeds = wards.reduce((s, w) => s + w.beds.length, 0);
  const occupied = wards.reduce((s, w) => s + w.beds.filter((b) => b.currentAdmission).length, 0);

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inpatient</h1>
          <p className="mt-1 text-sm text-white/60">
            {occupied} of {totalBeds} beds occupied · {awaiting.length} awaiting a bed
          </p>
        </div>
        {canSetup && (
          <Link href="/inpatient/wards" className="rounded-full border border-white/15 px-5 py-2.5 text-sm hover:bg-white/10">
            Ward setup
          </Link>
        )}
      </div>

      {awaiting.length > 0 && (
        <section className="mt-6 rounded-2xl border border-accent/40 bg-accent/10 p-5">
          <h2 className="text-sm font-semibold">Awaiting a bed</h2>
          <ul className="mt-3 space-y-4">
            {awaiting.map((a) => (
              <li key={a.id} className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Link href={`/inpatient/${a.id}`} className="font-medium hover:underline">
                    {fullName(a.patient)}
                  </Link>{" "}
                  <span className="font-mono text-xs text-white/45">{a.patient.hospitalNumber}</span>
                  <p className="text-xs text-white/55">
                    Admitted by Dr {a.admittingDoctor.lastName} · {formatDateTime(a.createdAt)}
                    {a.reason ? ` · ${a.reason}` : ""}
                  </p>
                </div>
                {canMove && <BedPicker action={moveToBed.bind(null, a.id)} wards={freeByWard} />}
              </li>
            ))}
          </ul>
        </section>
      )}

      {wards.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-sm text-white/60">
          No wards yet.{canSetup ? " Create them in Ward setup." : " Ask an admin to set up wards."}
        </div>
      ) : (
        wards.map((w) => (
          <section key={w.id} className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-sm font-semibold">
              {w.name}{" "}
              <span className="font-normal text-white/45">
                · {w.beds.filter((b) => b.currentAdmission).length}/{w.beds.length} occupied
              </span>
            </h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {w.beds.map((b) =>
                b.currentAdmission ? (
                  <Link
                    key={b.id}
                    href={`/inpatient/${b.currentAdmission.id}`}
                    className="rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm hover:bg-accent/20"
                  >
                    <p className="text-xs text-white/55">{b.label}</p>
                    <p className="font-medium">{fullName(b.currentAdmission.patient)}</p>
                    <p className="text-xs text-white/55">
                      Day {Math.max(1, daysUntil(today, localDate(b.currentAdmission.admittedAt)) + 1)}
                    </p>
                  </Link>
                ) : (
                  <div key={b.id} className="rounded-xl border border-dashed border-white/15 p-3 text-sm">
                    <p className="text-xs text-white/55">{b.label}</p>
                    <p className="text-white/45">Free</p>
                  </div>
                )
              )}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
