"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { checkAdjustment } from "@/lib/adjustments";
import { syncEncounterBill } from "@/lib/billing";
import { formatNaira, nairaToKobo } from "@/lib/money";
import { nextRefundNumber } from "@/lib/receipts";

const TYPES = ["DISCOUNT", "REFUND"];
const REFUND_METHODS = ["CASH", "TRANSFER"];

class AdjustmentError extends Error {}

function refresh(billId, encounterId) {
  revalidatePath(`/billing/${billId}`);
  revalidatePath("/billing");
  revalidatePath("/billing/approvals");
  revalidatePath("/billing/daily");
  if (encounterId) revalidatePath(`/consultations/${encounterId}`);
}

export async function requestAdjustment(billId, prevState, formData) {
  const session = await requirePermission("billing.payments");

  const type = String(formData.get("type") || "");
  const amountKobo = nairaToKobo(formData.get("amount"));
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200);
  const refundMethod = type === "REFUND" ? String(formData.get("refundMethod") || "") : null;
  const refundReference = type === "REFUND" ? String(formData.get("refundReference") ?? "").trim().slice(0, 60) || null : null;

  if (!TYPES.includes(type)) return { error: "Choose discount or refund." };
  if (reason.length < 5) return { error: "Give a clear reason (at least 5 characters)." };
  if (type === "REFUND" && !REFUND_METHODS.includes(refundMethod)) return { error: "Choose how the refund will be paid out." };

  const found = await prisma.bill.findUnique({ where: { id: billId }, select: { encounterId: true } });
  if (!found) return { error: "Bill not found." };
  await syncEncounterBill(found.encounterId);

  const bill = await prisma.bill.findUnique({ where: { id: billId }, select: { totalKobo: true, paidKobo: true } });
  const problem = checkAdjustment({ type, amountKobo, totalKobo: bill.totalKobo, paidKobo: bill.paidKobo });
  if (problem) return { error: problem };

  const pending = await prisma.billAdjustment.findFirst({ where: { billId, type, status: "PENDING" } });
  if (pending) return { error: `There's already a pending ${type.toLowerCase()} request on this bill.` };

  const adj = await prisma.billAdjustment.create({
    data: { billId, type, amountKobo, reason, refundMethod, refundReference, requestedById: session.userId },
  });
  await audit({
    action: "adjustment.request",
    entity: "Bill",
    entityId: billId,
    userId: session.userId,
    details: { adjustmentId: adj.id, type, amountKobo },
  });

  refresh(billId, found.encounterId);
  return { success: `${type === "DISCOUNT" ? "Discount" : "Refund"} of ${formatNaira(amountKobo)} sent for approval.`, savedAt: adj.id };
}

export async function decideAdjustment(prevState, formData) {
  const session = await requirePermission("billing.refunds.approve");
  const id = String(formData.get("adjustmentId") || "");
  const decision = String(formData.get("decision") || "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || null;

  const adj = await prisma.billAdjustment.findUnique({ where: { id }, include: { bill: { select: { encounterId: true } } } });
  if (!adj || adj.status !== "PENDING") return { error: "This request has already been decided." };

  // Segregation of duties: whoever asked can't approve
  if (adj.requestedById === session.userId) return { error: "You can't approve or reject your own request." };

  if (decision === "REJECT") {
    if (!note) return { error: "Give a reason for rejecting." };
    const done = await prisma.billAdjustment.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "REJECTED", decidedById: session.userId, decidedAt: new Date(), decisionNote: note },
    });
    if (done.count === 0) return { error: "Someone else just decided this request." };
    await audit({ action: "adjustment.reject", entity: "Bill", entityId: adj.billId, userId: session.userId, details: { adjustmentId: id } });
    refresh(adj.billId, adj.bill.encounterId);
    return { success: "Rejected." };
  }

  if (decision !== "APPROVE") return { error: "Choose approve or reject." };
  await syncEncounterBill(adj.bill.encounterId);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Bill" WHERE id = ${adj.billId} FOR UPDATE`;

      // Claim the request — only one approver can win
      const claimed = await tx.billAdjustment.updateMany({
        where: { id, status: "PENDING" },
        data: { status: "APPROVED", decidedById: session.userId, decidedAt: new Date(), decisionNote: note },
      });
      if (claimed.count === 0) throw new AdjustmentError("Someone else just decided this request.");

      // Re-check against the bill as it is NOW (it may have changed since the request)
      const bill = await tx.bill.findUnique({ where: { id: adj.billId }, select: { totalKobo: true, paidKobo: true } });
      const problem = checkAdjustment({ type: adj.type, amountKobo: adj.amountKobo, totalKobo: bill.totalKobo, paidKobo: bill.paidKobo });
      if (problem) throw new AdjustmentError(`Can't approve now: ${problem}`);

      if (adj.type === "DISCOUNT") {
        // A negative line on the bill — every existing total and balance check just works
        await tx.billItem.create({
          data: {
            billId: adj.billId,
            sourceType: "DISCOUNT",
            sourceId: adj.id,
            serviceCode: "DISCOUNT",
            description: `Discount — ${adj.reason}`,
            category: "OTHER",
            unitPriceKobo: -adj.amountKobo,
            quantity: 1,
            amountKobo: -adj.amountKobo,
          },
        });
        await tx.bill.update({ where: { id: adj.billId }, data: { totalKobo: { decrement: adj.amountKobo } } });
      } else {
        // A negative payment with its own refund number, paid out by the cashier who asked
        await tx.payment.create({
          data: {
            billId: adj.billId,
            receiptNumber: await nextRefundNumber(tx),
            amountKobo: -adj.amountKobo,
            method: adj.refundMethod,
            reference: adj.refundReference,
            billTotalKobo: bill.totalKobo,
            balanceAfterKobo: bill.totalKobo - (bill.paidKobo - adj.amountKobo),
            receivedById: adj.requestedById,
          },
        });
        await tx.bill.update({ where: { id: adj.billId }, data: { paidKobo: { decrement: adj.amountKobo } } });
      }
    });
  } catch (e) {
    if (e instanceof AdjustmentError) return { error: e.message };
    throw e;
  }

  await audit({
    action: "adjustment.approve",
    entity: "Bill",
    entityId: adj.billId,
    userId: session.userId,
    details: { adjustmentId: id, type: adj.type, amountKobo: adj.amountKobo },
  });
  refresh(adj.billId, adj.bill.encounterId);
  return { success: `Approved: ${adj.type === "DISCOUNT" ? "discount applied" : "refund recorded"}.` };
}
