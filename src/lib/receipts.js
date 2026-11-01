import { localDate } from "@/lib/time";

// Atomic yearly counters. Call inside a transaction.
async function nextNumber(tx, kind, prefix) {
  const year = localDate().slice(0, 4);
  const key = `${kind}-${year}`;
  const counter = await tx.counter.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `${prefix}-${year}-${String(counter.value).padStart(6, "0")}`;
}

export const nextReceiptNumber = (tx) => nextNumber(tx, "receipt", "RCT"); // RCT-2026-000001
export const nextRefundNumber = (tx) => nextNumber(tx, "refund", "RFD"); // RFD-2026-000001
