import { formatNaira, nairaToKobo } from "@/lib/money";
import { billTotal, desiredItems, diffBillItems } from "@/lib/billSync";
import { defaultPriceList } from "@/lib/defaultPrices";

const prices = new Map([
  ["CONSULT-REVIEW", { name: "Consultation — review", priceKobo: 200000 }],
  ["CONSULT-EMERGENCY", { name: "Emergency consultation", priceKobo: 1000000 }],
  ["LAB-FBC", { name: "Full blood count (FBC)", priceKobo: 500000 }],
  ["DRUG-paracetamol-500", { name: "Paracetamol 500 mg tablet", priceKobo: 2000 }],
]);
const visit = { id: "e1", visitType: "REVIEW", priority: "NORMAL", status: "COMPLETED" };
const labs = [{ id: "l1", testCode: "FBC", testName: "FBC" }];
const rxs = [{ id: "p1", drugId: "paracetamol-500", drugName: "Paracetamol", quantity: 18 }];

describe("money (kobo)", () => {
  it("formats kobo as naira", () => {
    expect(formatNaira(500000)).toBe("₦5,000.00");
    expect(formatNaira(36000)).toBe("₦360.00");
    expect(formatNaira(-150)).toBe("-₦1.50");
  });

  it("parses naira text to exact kobo without floats", () => {
    expect(nairaToKobo("5,000")).toBe(500000);
    expect(nairaToKobo("1500.5")).toBe(150050);
    expect(nairaToKobo("0.05")).toBe(5);
    expect(nairaToKobo("1.234")).toBeNull();
    expect(nairaToKobo("abc")).toBeNull();
  });
});

describe("desiredItems", () => {
  it("bills the consultation, each lab and each prescription × quantity", () => {
    const items = desiredItems({ encounter: visit, labs, prescriptions: rxs, prices });
    expect(items.map((i) => [i.serviceCode, i.amountKobo])).toEqual([
      ["CONSULT-REVIEW", 200000],
      ["LAB-FBC", 500000],
      ["DRUG-paracetamol-500", 36000],
    ]);
    expect(billTotal(items)).toBe(736000);
  });

  it("charges the emergency rate for emergency visits", () => {
    const [consult] = desiredItems({ encounter: { ...visit, priority: "EMERGENCY" }, labs: [], prescriptions: [], prices });
    expect(consult.serviceCode).toBe("CONSULT-EMERGENCY");
  });

  it("does not charge a consultation if the patient left without being seen", () => {
    expect(desiredItems({ encounter: { ...visit, status: "LEFT" }, labs: [], prescriptions: [], prices })).toEqual([]);
  });

  it("flags a service with no price instead of hiding it", () => {
    const [item] = desiredItems({ encounter: { ...visit, visitType: "NEW" }, labs: [], prescriptions: [], prices });
    expect(item).toMatchObject({ priceMissing: true, amountKobo: 0 });
  });
});

describe("diffBillItems", () => {
  const desired = desiredItems({ encounter: visit, labs, prescriptions: rxs, prices });
  const saved = desired.map((d, i) => ({ ...d, id: `b${i}`, status: "ACTIVE" }));

  it("creates every item on an empty bill", () => {
    expect(diffBillItems([], desired).toCreate).toHaveLength(3);
  });

  it("does nothing the second time (never bills twice)", () => {
    expect(diffBillItems(saved, desired)).toEqual({ toCreate: [], toVoid: [], toReprice: [] });
  });

  it("voids the line when its order is cancelled", () => {
    const withoutLab = desired.filter((d) => d.sourceType !== "LAB");
    expect(diffBillItems(saved, withoutLab).toVoid.map((i) => i.serviceCode)).toEqual(["LAB-FBC"]);
  });

  it("prices a line once a price has been set", () => {
    const unpriced = [{ ...saved[0], priceMissing: true, unitPriceKobo: 0, amountKobo: 0 }];
    const { toReprice } = diffBillItems(unpriced, [desired[0]]);
    expect(toReprice).toEqual([{ id: "b0", description: "Consultation — review", unitPriceKobo: 200000, amountKobo: 200000 }]);
  });
});

describe("defaultPriceList", () => {
  it("prices every service, with unique codes", () => {
    const list = defaultPriceList();
    expect(list).toHaveLength(71);
    expect(list.every((p) => p.priceKobo > 0)).toBe(true);
    expect(new Set(list.map((p) => p.code)).size).toBe(71);
  });
});
