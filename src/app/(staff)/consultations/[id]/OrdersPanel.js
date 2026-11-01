import { prisma } from "@/lib/prisma";
import { allocatePayments } from "@/lib/payments";
import PrescriptionPanel from "./PrescriptionPanel";
import LabPanel from "./LabPanel";

function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function OrdersPanel({ encounterId, canWrite, visitEnded, allergies }) {
  const [prescriptions, labs, bill] = await Promise.all([
    prisma.prescription.findMany({
      where: { encounterId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        drugId: true,
        drugName: true,
        unit: true,
        doseQty: true,
        frequency: true,
        durationDays: true,
        quantity: true,
        instructions: true,
        overrideReason: true,
        status: true,
      },
    }),
    prisma.labRequest.findMany({
      where: { encounterId },
      orderBy: { createdAt: "asc" },
      select: { id: true, testName: true, urgent: true, clinicalNote: true, status: true },
    }),
    prisma.bill.findUnique({
      where: { encounterId },
      select: {
        paidKobo: true,
        items: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "asc" },
          select: { sourceId: true, amountKobo: true, priceMissing: true },
        },
      },
    }),
  ]);

  // Pay before service: payments cover items in the order they were ordered
  const paidBySource = bill ? allocatePayments(bill.items, bill.paidKobo) : new Map();
  const writable = canWrite && !visitEnded;

  return (
    <>
      <Section title="Prescriptions">
        <PrescriptionPanel
          encounterId={encounterId}
          prescriptions={prescriptions.map((p) => ({ ...p, payment: paidBySource.get(p.id) ?? null }))}
          allergies={allergies}
          canWrite={writable}
        />
      </Section>
      <Section title="Lab requests">
        <LabPanel
          encounterId={encounterId}
          labs={labs.map((l) => ({ ...l, payment: paidBySource.get(l.id) ?? null }))}
          canWrite={writable}
        />
      </Section>
    </>
  );
}
