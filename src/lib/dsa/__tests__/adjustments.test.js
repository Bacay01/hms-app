import { checkAdjustment } from "@/lib/adjustments";
import { summarisePayments } from "@/lib/cashReport";
import { allocatePayments } from "@/lib/payments";
import { diffBillItems } from "@/lib/billSync";

describe("checkAdjustment", () => {
  it("allows a discount up to what is still owed", () => {
    expect(checkAdjustment({ type: "DISCOUNT", amountKobo: 200000, totalKobo: 1000000, paidKobo: 0 })).toBeNull();
    expect(checkAdjustment({ type: "DISCOUNT", amountKobo: 900000, totalKobo: 1000000, paidKobo: 500000 })).toMatch(/outstanding/);
  });

  it("only refunds a credit", () => {
    expect(checkAdjustment({ type: "REFUND", amountKobo: 100, totalKobo: 1000000, paidKobo: 1000000 })).toMatch(/no credit/);
    expect(checkAdjustment({ type: "REFUND", amountKobo: 200000, totalKobo: 800000, paidKobo: 1000000 })).toBeNull();
  });

  it("never refunds more than the credit", () => {
    expect(checkAdjustment({ type: "REFUND", amountKobo: 300000, totalKobo: 800000, paidKobo: 1000000 })).toMatch(/more than the credit/);
  });
});

describe("discount lines", () => {
  it("count as money available for pay-before-service", () => {
    const items = [{ sourceId: "consult", amountKobo: 1000000 }, { sourceId: "disc", amountKobo: -200000 }];
    expect(allocatePayments(items, 800000).get("consult")).toBe("PAID");
  });

  it("are never voided by the bill sync", () => {
    const discount = { id: "d1", sourceType: "DISCOUNT", sourceId: "adj1", status: "ACTIVE" };
    expect(diffBillItems([discount], []).toVoid).toEqual([]);
  });
});

describe("summarisePayments (end of day)", () => {
  const pay = (receivedById, method, amountKobo) => ({ receivedById, receivedByName: receivedById, method, amountKobo });

  it("totals each cashier by method and works out cash in the drawer", () => {
    const { cashiers, netKobo } = summarisePayments([
      pay("chidi", "CASH", 500000),
      pay("chidi", "POS", 300000),
      pay("chidi", "CASH", -100000), // cash refund
      pay("ada", "TRANSFER", 200000),
    ]);
    const chidi = cashiers.find((c) => c.id === "chidi");
    expect(chidi).toMatchObject({ receivedKobo: 800000, refundedKobo: 100000, netKobo: 700000, cashInDrawerKobo: 400000 });
    expect(netKobo).toBe(900000);
  });

  it("returns empty totals for a day with no payments", () => {
    expect(summarisePayments([])).toEqual({ cashiers: [], totalReceivedKobo: 0, totalRefundedKobo: 0, netKobo: 0 });
  });
});
