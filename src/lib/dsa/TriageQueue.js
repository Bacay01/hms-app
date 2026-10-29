// Triage queue for the hospital — the "priority lane" from the QueueUp capstone.
//
// Built on MinHeap. The comparator decides who is seen first:
//   1. Priority:     EMERGENCY (0) → URGENT (1) → NORMAL (2)
//   2. Queue number: lower number = arrived earlier
// Rule 2 makes it FIFO *within* each priority level, so two Normal patients
// are still seen first-come, first-served.

import { MinHeap } from "./MinHeap";

export const PRIORITY_RANK = { EMERGENCY: 0, URGENT: 1, NORMAL: 2 };

export function compareTriage(a, b) {
  const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (byPriority !== 0) return byPriority;
  return a.queueNumber - b.queueNumber;
}

export class TriageQueue {
  constructor(patients = []) {
    this.heap = new MinHeap(compareTriage);
    for (const p of patients) this.add(p);
  }

  add(patient) {                         // O(log n)
    if (!(patient.priority in PRIORITY_RANK)) {
      throw new Error(`Unknown priority: ${patient.priority}`);
    }
    this.heap.push(patient);
    return this;
  }

  next() {                               // O(log n) — remove the patient to see now
    return this.heap.pop();
  }

  peek() {                               // O(1) — who is next, without removing them
    return this.heap.peek();
  }

  size() {
    return this.heap.size();
  }

  isEmpty() {
    return this.heap.isEmpty();
  }

  inOrder() {                            // O(n log n) — the full calling order, for display
    return this.heap.toSortedArray();
  }
}
