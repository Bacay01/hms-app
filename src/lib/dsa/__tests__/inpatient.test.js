import { bedChargeLines, dosesToday } from "@/lib/inpatient";
import { diffBillItems } from "@/lib/billSync";

const today = "2026-11-30";
const stay = (id, fromDate, toDate, rateKobo = 1_500_000, wardName = "Male Medical") => ({ id, wardName, rateKobo, fromDate, toDate });

describe("bedChargeLines (per night)", () => {
  it("charges each night of an ongoing stay up to today", () => {
    expect(bedChargeLines([stay("s1", "2026-11-26", null)], today)).toEqual([{ stayId: "s1", wardName: "Male Medical", rateKobo: 1_500_000, nights: 4 }]);
  });

  it("splits a transfer between wards at each ward's rate", () => {
    const lines = bedChargeLines([stay("s1", "2026-11-26", "2026-11-28"), stay("s2", "2026-11-28", null, 2_500_000, "ICU")], today);
    expect(lines.map((l) => [l.wardName, l.nights, l.rateKobo])).toEqual([["Male Medical", 2, 1_500_000], ["ICU", 2, 2_500_000]]);
  });

  it("charges one day for a same-day admission and discharge", () => {
    expect(bedChargeLines([stay("s1", "2026-11-30", "2026-11-30")], today)[0].nights).toBe(1);
  });
});

describe("bed lines in the bill sync", () => {
  it("updates the number of nights instead of billing twice", () => {
    const existing = [{ id: "b1", sourceType: "BED", sourceId: "s1", status: "ACTIVE", quantity: 2, unitPriceKobo: 1_500_000, amountKobo: 3_000_000 }];
    const desired = [{ sourceType: "BED", sourceId: "s1", quantity: 3, unitPriceKobo: 1_500_000, amountKobo: 4_500_000 }];
    expect(diffBillItems(existing, desired)).toEqual({
      toCreate: [],
      toVoid: [],
      toReprice: [],
      toUpdate: [{ id: "b1", quantity: 3, unitPriceKobo: 1_500_000, amountKobo: 4_500_000 }],
    });
  });
});

describe("dosesToday", () => {
  it("counts what is still due on the medication chart", () => {
    expect(dosesToday("TDS", 2)).toEqual({ expected: 3, given: 2, remaining: 1 });
    expect(dosesToday("OD", 1).remaining).toBe(0);
  });
});
