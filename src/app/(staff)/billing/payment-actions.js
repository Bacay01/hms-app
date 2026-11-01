"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { syncEncounterBill } from "@/lib/billing";
import { formatNaira, nairaToKobo } from "@/lib/money";
import { localDate } from "@/lib/time";

const METHODS = ["CASH", "POS", "TRANSFER"];

class PaymentError extends Error {}

// RCT-2026-000001 — atomic counter, restarts each year
async function nextReceiptNumber(tx) {
  const year = localDate().slice(0, 4);
  const key = `receipt-${year}`;
  const counter = await tx.counter.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `RCT-${year}-${String(counter.value).padStart(6, "0")}`;
}

export async function recordPayment(billId, prevState, formData) {
  const session = await requirePermission("billing.payments");

  const amountKobo = nairaToKobo(formData.get("amount"));
  const method = String(formData.get("method") || "");
  const reference = String(formData.get("reference") ?? "").trim().slice(0, 60) || null;

  if (!amountKobo) return { error: "Enter an amount greater than zero." };
  if (!METHODS.includes(method)) return { error: "Choose cash, POS or transfer." };
  if (method !== "CASH" && !reference) {
    return { error: `Enter the ${method === "POS" ? "POS slip" : "transfer"} reference.` };
  }

  const found = await prisma.bill.findUnique({ where: { id: billId }, select: { encounterId: true } });
  if (!found) return { error: "Bill not found." };
  await syncEncounterBill(found.encounterId); // charge for everything ordered up to this moment

  let payment;
  try {
    payment = await prisma.$transaction(async (tx) => {
      // Lock this bill's row: a second payment on the same bill waits here until we finish
      await tx.$queryRaw`SELECT id FROM "Bill" WHERE id = ${billId} FOR UPDATE`;

      const bill = await tx.bill.findUnique({
        where: { id: billId },
        select: {
          totalKobo: true,
          paidKobo: true,
          items: { where: { status: "ACTIVE", priceMissing: true }, select: { id: true } },
        },
      });
      if (bill.items.length > 0) throw new PaymentError("Some items have no price yet. Ask the Admin to price them first.");

      const balance = bill.totalKobo - bill.paidKobo;
      if (balance <= 0) throw new PaymentError("This bill is already fully paid.");
      if (amountKobo > balance) throw new PaymentError(`That's more than the balance of ${formatNaira(balance)}.`);

      const created = await tx.payment.create({
        data: {
          billId,
          receiptNumber: await nextReceiptNumber(tx),
          amountKobo,
          method,
          reference,
          billTotalKobo: bill.totalKobo,
          balanceAfterKobo: balance - amountKobo,
          receivedById: session.userId,
        },
      });
      await tx.bill.update({ where: { id: billId }, data: { paidKobo: { increment: amountKobo } } });
      return created;
    });
  } catch (e) {
    if (e instanceof PaymentError) return { error: e.message };
    throw e;
  }

  await audit({
    action: "payment.record",
    entity: "Bill",
    entityId: billId,
    userId: session.userId,
    details: { paymentId: payment.id, receiptNumber: payment.receiptNumber, amountKobo, method },
  });

  revalidatePath(`/billing/${billId}`);
  revalidatePath("/billing");
  revalidatePath(`/consultations/${found.encounterId}`);
  return {
    success: `${formatNaira(amountKobo)} received — receipt ${payment.receiptNumber}.`,
    receiptId: payment.id,
  };
}
