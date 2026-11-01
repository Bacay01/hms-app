import { prisma } from "@/lib/prisma";
import { desiredItems, diffBillItems, priceCode } from "@/lib/billSync";

// Make a visit's bill match its orders. Safe to run any number of times.
export async function syncEncounterBill(encounterId) {
  const encounter = await prisma.encounter.findUnique({
    where: { id: encounterId },
    select: {
      id: true,
      patientId: true,
      visitType: true,
      priority: true,
      status: true,
      prescriptions: { where: { status: { not: "CANCELLED" } }, select: { id: true, drugId: true, drugName: true, quantity: true } },
      labRequests: { where: { status: { not: "CANCELLED" } }, select: { id: true, testCode: true, testName: true } },
    },
  });
  if (!encounter) return null;

  const codes = [
    priceCode.consultation(encounter),
    ...encounter.labRequests.map(priceCode.lab),
    ...encounter.prescriptions.map(priceCode.drug),
  ];
  const priceRows = await prisma.servicePrice.findMany({
    where: { code: { in: codes }, isActive: true },
    select: { code: true, name: true, priceKobo: true },
  });
  const prices = new Map(priceRows.map((p) => [p.code, p]));
  const desired = desiredItems({ encounter, labs: encounter.labRequests, prescriptions: encounter.prescriptions, prices });

  return prisma.$transaction(async (tx) => {
    const bill = await tx.bill.upsert({
      where: { encounterId },
      create: { encounterId, patientId: encounter.patientId },
      update: {},
      include: { items: true },
    });

    const { toCreate, toVoid, toReprice } = diffBillItems(bill.items, desired);

    if (toCreate.length) {
      await tx.billItem.createMany({ data: toCreate.map((d) => ({ ...d, billId: bill.id })), skipDuplicates: true });
    }
    if (toVoid.length) {
      await tx.billItem.updateMany({
        where: { id: { in: toVoid.map((i) => i.id) } },
        data: { status: "VOIDED", voidedAt: new Date(), voidReason: "Order cancelled" },
      });
    }
    for (const r of toReprice) {
      await tx.billItem.update({
        where: { id: r.id },
        data: { description: r.description, unitPriceKobo: r.unitPriceKobo, amountKobo: r.amountKobo, priceMissing: false },
      });
    }

    const active = await tx.billItem.findMany({ where: { billId: bill.id, status: "ACTIVE" }, select: { amountKobo: true } });
    const totalKobo = active.reduce((sum, i) => sum + i.amountKobo, 0);
    return tx.bill.update({ where: { id: bill.id }, data: { totalKobo } });
  });
}
