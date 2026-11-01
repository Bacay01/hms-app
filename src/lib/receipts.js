import { localDate } from "@/lib/time";

// RCT-2026-000001 — atomic counter, restarts each year. Call inside a transaction.
export async function nextReceiptNumber(tx) {
  const year = localDate().slice(0, 4);
  const key = `receipt-${year}`;
  const counter = await tx.counter.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `RCT-${year}-${String(counter.value).padStart(6, "0")}`;
}
