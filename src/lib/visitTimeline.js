import { DoublyLinkedList } from "@/lib/dsa/DoublyLinkedList";

// A patient's visits in date order, as a doubly linked list.
// nodeById gives O(1) access to any visit; .prev / .next are its neighbours — also O(1).
export function buildVisitTimeline(encounters) {
  const list = new DoublyLinkedList();
  const nodeById = new Map();
  const sorted = [...encounters].sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
  for (const e of sorted) nodeById.set(e.id, list.push(e));
  return { list, nodeById };
}
