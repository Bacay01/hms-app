import { parseAdjustment } from "@/lib/stock";
import { plainInstructions } from "@/lib/prescribing";

const form = (obj) => ({ get: (k) => obj[k] ?? "" });

describe("parseAdjustment", () => {
  it("removes stock with a signed, reasoned ledger entry", () => {
    const { data } = parseAdjustment(form({ type: "DAMAGED", quantity: "5", note: "Bottle dropped" }), 30);
    expect(data).toEqual({ type: "DAMAGED", movementType: "ADJUSTED", quantity: -5, reason: "Damaged / broken: Bottle dropped" });
  });

  it("adds stock when a count finds more", () => {
    expect(parseAdjustment(form({ type: "COUNT_UP", quantity: "3", note: "Found in drawer" }), 30).data.quantity).toBe(3);
  });

  it("never removes more than the batch holds", () => {
    expect(parseAdjustment(form({ type: "DAMAGED", quantity: "31", note: "Flood damage" }), 30).error).toMatch(/Only 30 on hand/);
  });

  it("requires a reason, except for expired write-offs", () => {
    expect(parseAdjustment(form({ type: "COUNT_DOWN", quantity: "2" }), 30).error).toMatch(/reason/);
    expect(parseAdjustment(form({ type: "EXPIRED", quantity: "40" }), 40).data).toMatchObject({ quantity: -40, reason: "Expired — write-off" });
  });

  it("records returns to the supplier as RETURNED", () => {
    expect(parseAdjustment(form({ type: "RETURN_TO_SUPPLIER", quantity: "10", note: "Wrong strength sent" }), 50).data.movementType).toBe("RETURNED");
  });
});

describe("plainInstructions", () => {
  it("writes directions a patient can follow", () => {
    expect(plainInstructions({ doseQty: 2, unit: "tablet", frequency: "TDS", durationDays: 6 })).toBe("Take 2 tablets three times a day for 6 days.");
    expect(plainInstructions({ doseQty: 1, unit: "capsule", frequency: "NOCTE", durationDays: 1 })).toBe("Take 1 capsule at night for 1 day.");
    expect(plainInstructions({ doseQty: 4, unit: "tablet", frequency: "STAT", durationDays: 1 })).toBe("Take 4 tablets now (one dose only).");
  });
});
