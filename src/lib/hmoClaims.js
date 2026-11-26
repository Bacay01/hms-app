import { prisma } from "@/lib/prisma";
import { nextMonth } from "@/lib/hmo";
import { dayRange } from "@/lib/time";

// Every HMO-covered line for one HMO, for visits that started in `month` ("YYYY-MM")
export async function claimLines(hmoId, month) {
  const from = dayRange(`${month}-01`).start;
  const to = dayRange(`${nextMonth(month)}-01`).start;
  const bills = await prisma.bill.findMany({
    where: { hmoId, hmoKobo: { gt: 0 }, encounter: { startedAt: { gte: from, lt: to } } },
    orderBy: { createdAt: "asc" },
    include: {
      patient: { select: { firstName: true, lastName: true, otherNames: true, hospitalNumber: true } },
      encounter: { select: { startedAt: true } },
      items: { where: { status: "ACTIVE", hmoKobo: { gt: 0 } }, orderBy: { createdAt: "asc" } },
    },
  });
  const totalKobo = bills.reduce((s, b) => s + b.hmoKobo, 0);
  return { bills, totalKobo };
}
