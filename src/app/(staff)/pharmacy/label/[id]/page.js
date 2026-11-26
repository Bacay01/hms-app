import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime, fullName } from "@/lib/patients";
import { plainInstructions, units } from "@/lib/prescribing";
import { SITE } from "@/lib/site";
import PrintPageButton from "@/components/staff/PrintPageButton";

export default function LabelPage({ params }) {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading label…</p>}>
      <Label params={params} />
    </Suspense>
  );
}

async function Label({ params }) {
  await requirePermission("pharmacy.read");
  const { id } = await params;

  const rx = await prisma.prescription.findUnique({
    where: { id },
    include: {
      patient: { select: { firstName: true, lastName: true, otherNames: true, hospitalNumber: true } },
      prescribedBy: { select: { lastName: true } },
      dispensedBy: { select: { firstName: true, lastName: true } },
    },
  });
  if (!rx) notFound();

  if (rx.status !== "DISPENSED") {
    return (
      <div className="max-w-md">
        <Link href="/pharmacy" className="text-sm text-white/60 hover:text-white">← Pharmacy</Link>
        <p className="mt-4 text-sm text-white/70">A label is printed once the prescription has been dispensed.</p>
      </div>
    );
  }

  // Which batches it came from — straight from the ledger, so a recall can be traced to this patient
  const movements = await prisma.stockMovement.findMany({
    where: { prescriptionId: rx.id, type: "DISPENSED" },
    include: { batch: { select: { batchNumber: true, expiryDate: true } } },
  });

  return (
    <div className="mx-auto max-w-sm">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/pharmacy" className="text-sm text-white/60 hover:text-white">← Pharmacy</Link>
        <PrintPageButton label="Print label" />
      </div>

      <article className="rounded-xl border-2 border-neutral-900 bg-white p-5 text-sm text-neutral-900 print:rounded-none">
        <div className="flex items-baseline justify-between border-b border-neutral-300 pb-2">
          <p className="font-bold">{SITE.name} Pharmacy</p>
          <p className="text-xs text-neutral-500">{formatDate(rx.dispensedAt)}</p>
        </div>

        <p className="mt-3 text-xs uppercase tracking-wider text-neutral-500">For</p>
        <p className="font-semibold">
          {fullName(rx.patient)} <span className="font-mono text-xs font-normal text-neutral-600">{rx.patient.hospitalNumber}</span>
        </p>

        <p className="mt-3 text-base font-bold">{rx.drugName}</p>
        <p className="mt-1 text-base">{plainInstructions(rx)}</p>
        {rx.instructions && <p className="mt-1 font-medium">{rx.instructions}</p>}

        <div className="mt-3 grid grid-cols-2 gap-1 text-xs">
          <p><span className="text-neutral-500">Quantity:</span> {units(rx.quantity, rx.unit)}</p>
          <p><span className="text-neutral-500">Prescriber:</span> Dr {rx.prescribedBy.lastName}</p>
          {movements.map((m) => (
            <p key={m.id} className="col-span-2">
              <span className="text-neutral-500">Batch:</span> <span className="font-mono">{m.batch.batchNumber}</span> · exp {m.batch.expiryDate} ·{" "}
              {Math.abs(m.quantity)}
            </p>
          ))}
        </div>

        <p className="mt-3 border-t border-neutral-300 pt-2 text-xs font-semibold">Keep out of reach of children.</p>
        <p className="text-[10px] text-neutral-500">
          Dispensed by {rx.dispensedBy?.firstName} {rx.dispensedBy?.lastName} · {formatDateTime(rx.dispensedAt)}
        </p>
      </article>
    </div>
  );
}
