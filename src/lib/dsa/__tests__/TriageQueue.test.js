import { TriageQueue } from "../TriageQueue";

const p = (name, priority, queueNumber) => ({ name, priority, queueNumber });

describe("TriageQueue", () => {
  it("sees emergencies first, even if they arrived last", () => {
    const tq = new TriageQueue([
      p("Tunde", "NORMAL", 1),
      p("Ibrahim", "NORMAL", 2),
      p("Unknown Male", "EMERGENCY", 5),
    ]);
    expect(tq.next().name).toBe("Unknown Male");
  });

  it("orders Emergency → Urgent → Normal", () => {
    const tq = new TriageQueue([
      p("Tunde", "NORMAL", 1),
      p("Folake", "URGENT", 3),
      p("Unknown Male", "EMERGENCY", 5),
    ]);
    expect(tq.inOrder().map((x) => x.name)).toEqual(["Unknown Male", "Folake", "Tunde"]);
  });

  it("is first-come, first-served within the same priority", () => {
    const tq = new TriageQueue([
      p("Ibrahim", "NORMAL", 4),
      p("Samuel", "NORMAL", 1),
      p("Tunde", "NORMAL", 2),
    ]);
    expect(tq.inOrder().map((x) => x.queueNumber)).toEqual([1, 2, 4]);
  });

  it("inOrder does not remove anyone from the queue", () => {
    const tq = new TriageQueue([p("A", "NORMAL", 1), p("B", "URGENT", 2)]);
    tq.inOrder();
    expect(tq.size()).toBe(2);
    expect(tq.peek().name).toBe("B");
  });

  it("rejects an unknown priority", () => {
    expect(() => new TriageQueue([p("X", "VIP", 1)])).toThrow("Unknown priority");
  });
});
