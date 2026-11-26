import { orderPharmacyQueue, planDispense } from "@/lib/dispensing";

const today = "2026-11-26";
const batch = (id, expiryDate, quantityOnHand, createdAt = "2026-11-01T10:00:00Z") => ({ id, batchNumber: id, expiryDate, quantityOnHand, createdAt });

describe("planDispense (FEFO with a MinHeap)", () => {
  it("takes from the soonest-expiring batch first", () => {
    const { picks } = planDispense([batch("late", "2027-12-31", 200), batch("soon", "2027-01-25", 30)], 18, today);
    expect(picks).toEqual([{ batchId: "soon", batchNumber: "soon", expiryDate: "2027-01-25", quantity: 18 }]);
  });

  it("splits across batches when one runs out", () => {
    const { picks } = planDispense([batch("late", "2027-12-31", 200), batch("soon", "2027-01-25", 30)], 36, today);
    expect(picks.map((p) => [p.batchId, p.quantity])).toEqual([["soon", 30], ["late", 6]]);
  });

  it("never dispenses from an expired batch", () => {
    const { picks } = planDispense([batch("expired", "2026-11-21", 40), batch("ok", "2027-06-01", 100)], 10, today);
    expect(picks.map((p) => p.batchId)).toEqual(["ok"]);
  });

  it("refuses when usable stock is short, mentioning expired stock", () => {
    const result = planDispense([batch("expired", "2026-11-21", 40), batch("ok", "2027-06-01", 24)], 30, today, "tablet");
    expect(result.error).toBe("Only 24 tablets usable in stock — 30 tablets needed (40 tablets more are expired).");
  });

  it("breaks expiry ties by whichever was received first", () => {
    const { picks } = planDispense(
      [batch("newer", "2027-06-01", 50, "2026-11-20T10:00:00Z"), batch("older", "2027-06-01", 50, "2026-11-01T10:00:00Z")],
      10,
      today
    );
    expect(picks[0].batchId).toBe("older");
  });
});

describe("orderPharmacyQueue (TriageQueue)", () => {
  it("serves emergency visits first, then whoever has waited longest", () => {
    const ordered = orderPharmacyQueue([
      { id: "normal-old", priority: "NORMAL", oldestAt: "2026-11-26T08:00:00Z" },
      { id: "normal-new", priority: "NORMAL", oldestAt: "2026-11-26T10:00:00Z" },
      { id: "emergency", priority: "EMERGENCY", oldestAt: "2026-11-26T11:00:00Z" },
    ]);
    expect(ordered.map((g) => g.id)).toEqual(["emergency", "normal-old", "normal-new"]);
  });
});
