import { TriageQueue } from "@/lib/dsa/TriageQueue";

// The SAME priority queue that orders patients orders the lab bench:
// tests from emergency visits → urgent tests → everything else, oldest first.
export function labPriority(lab) {
  if (lab.encounterPriority === "EMERGENCY") return "EMERGENCY";
  return lab.urgent ? "URGENT" : "NORMAL";
}

export function orderLabWorklist(labs) {
  const items = labs.map((lab) => ({
    ...lab,
    priority: labPriority(lab),
    queueNumber: new Date(lab.createdAt).getTime(), // earlier request = smaller number = sooner
  }));
  return new TriageQueue(items).inOrder();
}

// Pay before service. Emergencies are never blocked; otherwise unpaid needs a stated reason.
export function canCollect({ payment, emergency, overrideReason }) {
  if (payment === "PAID" || emergency) return null;
  if (overrideReason && overrideReason.trim().length >= 5) return null;
  return payment === "PART"
    ? "Only part-paid. Collect payment first, or give a reason to go ahead (e.g. admitted patient, HMO)."
    : "Not paid yet. Collect payment first, or give a reason to go ahead (e.g. admitted patient, HMO).";
}

export function waitedText(from, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - new Date(from).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

// Two-person rule: results must be verified by someone OTHER than whoever entered them
export function canVerify({ status, resultedById, userId }) {
  if (status !== "RESULTED") return "Only results awaiting verification can be verified.";
  if (resultedById === userId) return "You entered these results — another scientist must verify them.";
  return null;
}

// Short flags for the printed report
export const FLAG_SHORT = { LOW: "L", HIGH: "H", CRITICAL_LOW: "LL", CRITICAL_HIGH: "HH", ABNORMAL: "A" };
