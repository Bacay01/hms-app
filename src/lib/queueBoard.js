import { TriageQueue } from "@/lib/dsa/TriageQueue";
import { ACTIVE_STATUSES } from "@/lib/queue";

// Set → O(1) "is this status still in the queue?" checks
const ACTIVE = new Set(ACTIVE_STATUSES);

export const EMPTY_QUEUE = { active: [], waiting: 0, emergencies: 0, done: 0, left: 0 };

// One pass over today's visits → Map(doctorId → that doctor's queue).
// Grouping is O(n). Each doctor's active patients go into a TriageQueue (MinHeap),
// so their calling order costs O(k log k) for k patients.
// (The old version filtered the whole list once per doctor: O(n × d).)
export function groupQueueByDoctor(encounters) {
  const groups = new Map();

  for (const e of encounters) {
    if (!e.doctorId) continue;

    if (!groups.has(e.doctorId)) {
      groups.set(e.doctorId, { triage: new TriageQueue(), waiting: 0, emergencies: 0, done: 0, left: 0 });
    }
    const g = groups.get(e.doctorId);

    if (ACTIVE.has(e.status)) {
      g.triage.add(e);
      if (e.status === "WAITING") g.waiting++;
      if (e.priority === "EMERGENCY") g.emergencies++;
    } else if (e.status === "COMPLETED") {
      g.done++;
    } else if (e.status === "LEFT") {
      g.left++;
    }
  }

  const result = new Map();
  for (const [doctorId, g] of groups) {
    result.set(doctorId, {
      active: g.triage.inOrder(),
      waiting: g.waiting,
      emergencies: g.emergencies,
      done: g.done,
      left: g.left,
    });
  }
  return result;
}
