import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/nav";
import { formatNaira } from "@/lib/money";
import { formatDateTime } from "@/lib/patients";
import { requestAdjustment } from "../adjustment-actions";
import { AdjustmentForm, DecisionButtons } from "./AdjustmentControls";

const STATUS_STYLE = {
  PENDING: "border border-white/20 text-white/80",
  APPROVED: "bg-white/15 text-white",
  REJECTED: "border border-accent/50 text-red-200",
};

export default async function AdjustmentsPanel({ billId, totalKobo, paidKobo }) {
  const session = await requireSession();
  const canRequest = can(session.permissions, "billing.payments");
  const canDecide = can(session.permissions, "billing.refunds.approve");

  const adjustments = await prisma.billAdjustment.findMany({
    where: { billId },
    orderBy: { createdAt: "desc" },
    include: {
      requestedBy: { select: { firstName: true, lastName: true } },
      decidedBy: { select: { firstName: true, lastName: true } },
    },
  });
  if (!canRequest && !canDecide && adjustments.length === 0) return null;

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <h2 className="text-sm font-semibold">Discounts &amp; refunds</h2>

      {adjustments.length > 0 && (
        <ul className="mt-3 divide-y divide-white/5">
          {adjustments.map((a) => (
            <li key={a.id} className="py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p>
                  <span className="font-medium">{a.type === "DISCOUNT" ? "Discount" : "Refund"}</span> of{" "}
                  <span className="font-semibold">{formatNaira(a.amountKobo)}</span>
                  {a.type === "REFUND" && a.refundMethod ? ` · ${a.refundMethod.toLowerCase()}` : ""}
                </p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_STYLE[a.status]}`}>{a.status.toLowerCase()}</span>
              </div>
              <p className="text-xs text-white/55">
                “{a.reason}” · asked by {a.requestedBy.firstName} {a.requestedBy.lastName}, {formatDateTime(a.createdAt)}
              </p>
              {a.decidedBy && (
                <p className="text-xs text-white/55">
                  {a.status.toLowerCase()} by {a.decidedBy.firstName} {a.decidedBy.lastName}
                  {a.decisionNote ? ` — “${a.decisionNote}”` : ""}
                </p>
              )}
              {a.status === "PENDING" && canDecide && a.requestedById !== session.userId && <DecisionButtons adjustmentId={a.id} />}
              {a.status === "PENDING" && a.requestedById === session.userId && (
                <p className="mt-1 text-xs text-white/45">Waiting for someone else to approve.</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {canRequest && (
        <div className="mt-4">
          <AdjustmentForm
            action={requestAdjustment.bind(null, billId)}
            outstandingKobo={totalKobo - paidKobo}
            creditKobo={paidKobo - totalKobo}
          />
        </div>
      )}
    </section>
  );
}
