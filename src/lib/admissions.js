import { prisma } from "@/lib/prisma";

// An admitted patient's record stays open (orders, vitals) until discharge
export async function isInpatient(encounterId) {
  const admission = await prisma.admission.findUnique({ where: { encounterId }, select: { status: true } });
  return Boolean(admission && admission.status !== "DISCHARGED");
}
