import { prisma } from "@/lib/prisma";
import { allocatePayments } from "@/lib/payments";
import { syncEncounterBill } from "@/lib/billing";

// encounterIds → Map(encounterId → Map(sourceId → "PAID" | "PART" | "UNPAID"))
export async function paymentStatusesForEncounters(encounterIds) {
  if (encounterIds.length === 0) return new Map();
  const bills = await prisma.bill.findMany({
    where: { encounterId: { in: encounterIds } },
    select: {
      encounterId: true,
      paidKobo: true,
      items: { where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" }, select: { sourceId: true, amountKobo: true, priceMissing: true } },
    },
  });
  return new Map(bills.map((b) => [b.encounterId, allocatePayments(b.items, b.paidKobo)]));
}

// One test's payment status, with the bill brought up to date first
export async function labPaymentStatus(lab) {
  await syncEncounterBill(lab.encounterId);
  const byEncounter = await paymentStatusesForEncounters([lab.encounterId]);
  return byEncounter.get(lab.encounterId)?.get(lab.id) ?? "UNPAID";
}
