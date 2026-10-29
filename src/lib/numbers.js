import { HOSPITAL_NUMBER_PREFIX } from "@/lib/patients";
import { localDate } from "@/lib/time";

// Atomic counters — safe even when two people click at the same moment.
// Always call inside prisma.$transaction(async (tx) => ...).
async function increment(tx, key) {
  const counter = await tx.counter.upsert({
    where: { key },
    update: { value: { increment: 1 } },
    create: { key, value: 1 },
  });
  return counter.value;
}

// ILH-2026-000001 — resets every year
export async function nextHospitalNumber(tx) {
  const year = localDate().slice(0, 4);
  const n = await increment(tx, `patient-${year}`);
  return `${HOSPITAL_NUMBER_PREFIX}-${year}-${String(n).padStart(6, "0")}`;
}

// 1, 2, 3... per doctor, resets every day
export async function nextQueueNumber(tx, doctorId) {
  return increment(tx, `queue-${doctorId}-${localDate()}`);
}
