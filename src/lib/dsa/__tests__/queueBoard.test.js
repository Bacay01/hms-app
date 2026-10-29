import { groupQueueByDoctor } from "@/lib/queueBoard";

const e = (id, doctorId, status, priority, queueNumber) => ({ id, doctorId, status, priority, queueNumber });

describe("groupQueueByDoctor", () => {
  const visits = [
    e("a", "dayo", "WAITING", "NORMAL", 1),
    e("b", "dayo", "WAITING", "NORMAL", 2),
    e("c", "dayo", "WAITING", "URGENT", 3),
    e("d", "dayo", "WITH_NURSE", "EMERGENCY", 4),
    e("e", "dayo", "COMPLETED", "NORMAL", 5),
    e("f", "dayo", "LEFT", "NORMAL", 6),
    e("g", "kunle", "WAITING", "NORMAL", 1),
  ];
  const board = groupQueueByDoctor(visits);

  it("groups visits by doctor", () => {
    expect([...board.keys()].sort()).toEqual(["dayo", "kunle"]);
  });

  it("orders each doctor's active patients by triage", () => {
    expect(board.get("dayo").active.map((x) => x.id)).toEqual(["d", "c", "a", "b"]);
  });

  it("counts waiting, emergencies, done and left", () => {
    const dayo = board.get("dayo");
    expect(dayo.waiting).toBe(3);
    expect(dayo.emergencies).toBe(1);
    expect(dayo.done).toBe(1);
    expect(dayo.left).toBe(1);
  });

  it("returns an empty map for no visits", () => {
    expect(groupQueueByDoctor([]).size).toBe(0);
  });
});
