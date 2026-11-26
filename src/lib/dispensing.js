import { MinHeap } from "@/lib/dsa/MinHeap";
import { TriageQueue } from "@/lib/dsa/TriageQueue";
import { daysUntil } from "@/lib/stock";

// Soonest expiry first; if two expire the same day, the one received first goes first
const byExpiry = (a, b) =>
  a.expiryDate < b.expiryDate ? -1 : a.expiryDate > b.expiryDate ? 1 : new Date(a.createdAt) - new Date(b.createdAt);

// FEFO — First Expiry, First Out.
// Unexpired batches go into a MinHeap keyed on expiry; we pop the soonest-expiring batch and take
// what it has, then the next, until the quantity is met. Expired batches never enter the heap.
// Returns { picks: [{ batchId, batchNumber, expiryDate, quantity }] } or { error, usable, expired }.
export function planDispense(batches, quantity, today, unit = "unit") {
  const heap = new MinHeap(byExpiry);
  let expired = 0;

  for (const b of batches) {
    if (b.quantityOnHand <= 0) continue;
    if (daysUntil(b.expiryDate, today) < 0) {
      expired += b.quantityOnHand;
      continue;
    }
    heap.push(b); // O(log n)
  }

  const picks = [];
  let remaining = quantity;
  while (remaining > 0 && !heap.isEmpty()) {
    const batch = heap.pop(); // O(log n) — always the soonest-expiring usable batch
    const take = Math.min(batch.quantityOnHand, remaining);
    picks.push({ batchId: batch.id, batchNumber: batch.batchNumber, expiryDate: batch.expiryDate, quantity: take });
    remaining -= take;
  }

  if (remaining > 0) {
    const usable = quantity - remaining;
    const plural = (n) => `${n} ${unit}${n === 1 ? "" : "s"}`;
    return {
      error: `Only ${plural(usable)} usable in stock — ${plural(quantity)} needed${expired ? ` (${plural(expired)} more are expired)` : ""}.`,
      usable,
      expired,
    };
  }
  return { picks };
}

// Pharmacy queue: the same priority queue as patients — emergency visits first, then longest waiting
export function orderPharmacyQueue(groups) {
  return new TriageQueue(groups.map((g) => ({ ...g, queueNumber: new Date(g.oldestAt).getTime() }))).inOrder();
}
