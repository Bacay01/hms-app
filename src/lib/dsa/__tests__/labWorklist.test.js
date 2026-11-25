import { canCollect, orderLabWorklist, waitedText } from "@/lib/labWorklist";

const lab = (id, createdAt, { urgent = false, encounterPriority = "NORMAL" } = {}) => ({ id, createdAt, urgent, encounterPriority });

describe("orderLabWorklist (TriageQueue)", () => {
  it("puts emergency visits first, then urgent, then the rest", () => {
    const ordered = orderLabWorklist([
      lab("normal", "2026-11-25T08:00:00Z"),
      lab("urgent", "2026-11-25T09:00:00Z", { urgent: true }),
      lab("emergency", "2026-11-25T10:00:00Z", { encounterPriority: "EMERGENCY" }),
    ]);
    expect(ordered.map((l) => l.id)).toEqual(["emergency", "urgent", "normal"]);
  });

  it("serves the oldest request first within the same priority", () => {
    const ordered = orderLabWorklist([lab("later", "2026-11-25T10:00:00Z"), lab("earlier", "2026-11-25T08:00:00Z")]);
    expect(ordered.map((l) => l.id)).toEqual(["earlier", "later"]);
  });
});

describe("canCollect (pay before service)", () => {
  it("allows paid tests and emergencies straight away", () => {
    expect(canCollect({ payment: "PAID" })).toBeNull();
    expect(canCollect({ payment: "UNPAID", emergency: true })).toBeNull();
  });

  it("needs a reason for unpaid or part-paid tests", () => {
    expect(canCollect({ payment: "UNPAID" })).toMatch(/Not paid/);
    expect(canCollect({ payment: "PART", overrideReason: "ok" })).toMatch(/part-paid/);
    expect(canCollect({ payment: "UNPAID", overrideReason: "Admitted patient" })).toBeNull();
  });
});

describe("waitedText", () => {
  it("shows minutes, then hours and minutes", () => {
    const now = new Date("2026-11-25T12:00:00Z").getTime();
    expect(waitedText("2026-11-25T11:35:00Z", now)).toBe("25 min");
    expect(waitedText("2026-11-25T09:50:00Z", now)).toBe("2 h 10 min");
  });
});
