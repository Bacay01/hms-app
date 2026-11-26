import { prisma } from "@/lib/prisma";
import { desiredItems, diffBillItems, priceCode } from "@/lib/billSync";
import { bedChargeLines } from "@/lib/inpatient";
import { enrolmentValid, splitBill } from "@/lib/hmo";
import { localDate } from "@/lib/time";

// Make a visit's bill match its orders, bed nights and HMO cover. Safe to run any number of times.
// bill.totalKobo = what the PATIENT owes (gross − HMO share), so all payment logic works on that.
export async function syncEncounterBill(encounterId) {
  const encounter = await prisma.encounter.findUnique({
    where: { id: encounterId },
    select: {
      id: true,
      patientId: true,
      visitType: true,
      priority: true,
      status: true,
      startedAt: true,
      prescriptions: { where: { status: { not: "CANCELLED" } }, select: { id: true, drugId: true, drugName: true, quantity: true } },
      labRequests: { where: { status: { not: "CANCELLED" } }, select: { id: true, testCode: true, testName: true } },
      admission: { select: { bedStays: { select: { id: true, wardName: true, rateKobo: true, from: true, to: true } } } },
    },
  });
  if (!encounter) return null;

  const codes = [
    priceCode.consultation(encounter),
    ...encounter.labRequests.map(priceCode.lab),
    ...encounter.prescriptions.map(priceCode.drug),
  ];
  const [priceRows, link] = await Promise.all([
    prisma.servicePrice.findMany({ where: { code: { in: codes }, isActive: true }, select: { code: true, name: true, priceKobo: true } }),
    prisma.patientHmo.findFirst({
      where: { patientId: encounter.patientId, isActive: true },
      orderBy: { createdAt: "desc" },
      include: { plan: { include: { hmo: true, coverage: true } } },
    }),
  ]);
  const prices = new Map(priceRows.map((p) => [p.code, p]));

  const stays = (encounter.admission?.bedStays ?? []).map((s) => ({
    id: s.id,
    wardName: s.wardName,
    rateKobo: s.rateKobo,
    fromDate: localDate(s.from),
    toDate: s.to ? localDate(s.to) : null,
  }));
  const bedLines = bedChargeLines(stays, localDate());
  const desired = desiredItems({ encounter, labs: encounter.labRequests, prescriptions: encounter.prescriptions, prices, bedLines });

  const covered = enrolmentValid(link, localDate(encounter.startedAt)) && link.plan.isActive && link.plan.hmo.isActive;
  const coverage = covered ? new Map(link.plan.coverage.map((c) => [c.category, c])) : null;

  return prisma.$transaction(async (tx) => {
    const bill = await tx.bill.upsert({
      where: { encounterId },
      create: { encounterId, patientId: encounter.patientId },
      update: {},
      include: { items: true },
    });

    const { toCreate, toVoid, toReprice, toUpdate } = diffBillItems(bill.items, desired);
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
    for (const u of toUpdate) {
      await tx.billItem.update({ where: { id: u.id }, data: { quantity: u.quantity, unitPriceKobo: u.unitPriceKobo, amountKobo: u.amountKobo } });
    }

    // HMO split on the final set of lines
    const items = await tx.billItem.findMany({
      where: { billId: bill.id },
      select: { id: true, status: true, amountKobo: true, category: true, preauthCode: true, hmoKobo: true, preauthRequired: true },
    });
    const split = splitBill(items, coverage);
    for (const it of items) {
      const r = split.perItem.get(it.id);
      if (r.hmoKobo !== it.hmoKobo || r.preauthRequired !== it.preauthRequired) {
        await tx.billItem.update({ where: { id: it.id }, data: { hmoKobo: r.hmoKobo, preauthRequired: r.preauthRequired } });
      }
    }

    return tx.bill.update({
      where: { id: bill.id },
      data: {
        grossKobo: split.grossKobo,
        hmoKobo: split.hmoKobo,
        totalKobo: split.patientKobo,
        hmoId: covered ? link.plan.hmoId : null,
        hmoPlanName: covered ? `${link.plan.hmo.name} — ${link.plan.name}` : null,
        enrolmentNo: covered ? link.enrolmentNumber : null,
      },
    });
  });
}
