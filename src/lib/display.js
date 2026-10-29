import { CircularQueue } from "@/lib/dsa/CircularQueue";

export const NURSE_STATION = "Nurses' station";

// Turns today's visits into a stream of "calls" (oldest → newest):
//   nurseAt  → called to the nurses' station
//   doctorAt → called to the doctor's consulting room
// A ring buffer (CircularQueue with overwrite) keeps only the latest N —
// exactly what a waiting-room screen shows. No names, only numbers and places.
export function buildCallHistory(encounters, roomByDoctorId, capacity = 6) {
  const calls = [];

  for (const e of encounters) {
    const emergency = e.priority === "EMERGENCY";
    if (e.nurseAt) {
      calls.push({ id: `${e.id}-n`, number: e.queueNumber, place: NURSE_STATION, at: new Date(e.nurseAt).getTime(), emergency });
    }
    if (e.doctorAt) {
      calls.push({
        id: `${e.id}-d`,
        number: e.queueNumber,
        place: roomByDoctorId.get(e.doctorId) ?? "the consulting room",
        at: new Date(e.doctorAt).getTime(),
        emergency,
      });
    }
  }

  calls.sort((a, b) => a.at - b.at);

  const ring = new CircularQueue(capacity, { overwrite: true });
  for (const call of calls) ring.enqueue(call);

  const newestFirst = ring.toArray().reverse();
  return { latest: newestFirst[0] ?? null, recent: newestFirst.slice(1) };
}
