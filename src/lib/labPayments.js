import { prisma } from "@/lib/prisma";
import { allocatePayments } from "@/lib/payments";
import { syncEncounterBill } from "@/lib/billing";

// encounterIds → Map(encounterId → Map(sourceId → "PAID" | "PART" | "UNPAID"))
// Allocation uses the PATIENT's share of each line — what the HMO covers needs no payment.
export async function paymentStatusesForEncounters(encounterIds) {
  if (encounterIds.length === 0) return new Map();
  const bills = await prisma.bill.findMany({
    where: { encounterId: { in: encounterIds } },
    select: {
      encounterId: true,
      paidKobo: true,
      items: { where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" }, select: { sourceId: true, amountKobo: true, hmoKobo: true, priceMissing: true } },
    },
  });
  return new Map(
    bills.map((b) => [b.encounterId, allocatePayments(b.items.map((i) => ({ ...i, amountKobo: i.amountKobo - i.hmoKobo })), b.paidKobo)])
  );
}

// One order's payment status, with the bill brought up to date first
export async function labPaymentStatus(order) {
  await syncEncounterBill(order.encounterId);
  const byEncounter = await paymentStatusesForEncounters([order.encounterId]);
  return byEncounter.get(order.encounterId)?.get(order.id) ?? "UNPAID";
}

// Same pay-before-service check for any billed order (lab test or prescription): needs { id, encounterId }
export const orderPaymentStatus = labPaymentStatus;
