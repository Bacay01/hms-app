import { enrolmentValid, itemCoverage, nextMonth, splitBill } from "@/lib/hmo";
import { toCsv } from "@/lib/csv";

const coverage = new Map([
  ["CONSULTATION", { percent: 100, requiresPreauth: false }],
  ["DRUG", { percent: 90, requiresPreauth: false }],
  ["BED", { percent: 100, requiresPreauth: true }],
]);
const item = (id, category, amountKobo, extra = {}) => ({ id, category, amountKobo, status: "ACTIVE", ...extra });

describe("itemCoverage", () => {
  it("covers in full where the plan pays 100%", () => {
    expect(itemCoverage(item("c", "CONSULTATION", 500000), coverage)).toEqual({ hmoKobo: 500000, preauthRequired: false });
  });

  it("leaves a co-pay and rounds the HMO share down", () => {
    expect(itemCoverage(item("d", "DRUG", 36005), coverage).hmoKobo).toBe(32404); // 90% of 36005 = 32404.5 → 32404
  });

  it("pays nothing until a required pre-auth code is recorded", () => {
    expect(itemCoverage(item("b", "BED", 1500000), coverage)).toEqual({ hmoKobo: 0, preauthRequired: true });
    expect(itemCoverage(item("b", "BED", 1500000, { preauthCode: "PA-123" }), coverage).hmoKobo).toBe(1500000);
  });

  it("covers nothing without a plan, for uncovered categories, or for discounts", () => {
    expect(itemCoverage(item("l", "LAB", 200000), coverage).hmoKobo).toBe(0);
    expect(itemCoverage(item("c", "CONSULTATION", 500000), null).hmoKobo).toBe(0);
    expect(itemCoverage(item("x", "OTHER", -100000), coverage).hmoKobo).toBe(0);
  });
});

describe("splitBill", () => {
  it("splits gross into HMO and patient shares", () => {
    const { grossKobo, hmoKobo, patientKobo } = splitBill(
      [item("c", "CONSULTATION", 500000), item("d", "DRUG", 600000), item("l", "LAB", 200000), item("v", "DRUG", 99999, { status: "VOIDED" })],
      coverage
    );
    expect({ grossKobo, hmoKobo, patientKobo }).toEqual({ grossKobo: 1300000, hmoKobo: 1040000, patientKobo: 260000 });
  });
});

describe("enrolment and months", () => {
  it("only covers visits within the valid-until date", () => {
    expect(enrolmentValid({ isActive: true, validUntil: "2026-12-31" }, "2026-11-26")).toBe(true);
    expect(enrolmentValid({ isActive: true, validUntil: "2026-10-31" }, "2026-11-26")).toBe(false);
    expect(enrolmentValid({ isActive: false, validUntil: null }, "2026-11-26")).toBe(false);
  });

  it("rolls over to the next month and year", () => {
    expect(nextMonth("2026-11")).toBe("2026-12");
    expect(nextMonth("2026-12")).toBe("2027-01");
  });
});

describe("toCsv", () => {
  it("quotes commas and doubles quotes", () => {
    expect(toCsv(["Name", "Item"], [["Adewale, Tunde", 'Bed "ICU"']])).toBe('Name,Item\r\n"Adewale, Tunde","Bed ""ICU"""');
  });
});
