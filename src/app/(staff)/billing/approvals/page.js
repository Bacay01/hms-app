import { Suspense } from "react";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatNaira } from "@/lib/money";
import { formatDateTime, fullName } from "@/lib/patients";
import { DecisionButtons } from "../[id]/AdjustmentControls";

export default function ApprovalsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading…</p>}>
      <Approvals />
    </Suspense>
  );
}

async function Approvals() {
  const session = await requirePermission("billing.refunds.approve");
  const pending = await prisma.billAdjustment.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      requestedBy: { select: { firstName: true, lastName: true } },
      bill: { select: { id: true, patient: { select: { firstName: true, lastName: true, otherNames: true, hospitalNumber: true } } } },
    },
  });

  return (
    <div className="max-w-4xl">
      <Link href="/billing" className="text-sm text-white/60 hover:text-white">← Billing</Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Approvals</h1>
      <p className="mt-1 text-sm text-white/60">Discounts and refunds waiting for a decision, oldest first. You can&apos;t decide your own requests.</p>

      {pending.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-sm text-white/60">Nothing waiting.</div>
      ) : (
        <ul className="mt-6 space-y-3">
          {pending.map((a) => (
            <li key={a.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p>
                  <span className="font-semibold">{a.type === "DISCOUNT" ? "Discount" : "Refund"} {formatNaira(a.amountKobo)}</span> for{" "}
                  <Link href={`/billing/${a.bill.id}`} className="underline">
                    {fullName(a.bill.patient)}
                  </Link>{" "}
                  <span className="font-mono text-xs text-white/45">{a.bill.patient.hospitalNumber}</span>
                </p>
                <span className="text-xs text-white/45">{formatDateTime(a.createdAt)}</span>
              </div>
              <p className="mt-1 text-xs text-white/60">
                “{a.reason}” · asked by {a.requestedBy.firstName} {a.requestedBy.lastName}
              </p>
              {a.requestedById === session.userId ? (
                <p className="mt-2 text-xs text-white/45">Your own request — another approver must decide it.</p>
              ) : (
                <DecisionButtons adjustmentId={a.id} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
