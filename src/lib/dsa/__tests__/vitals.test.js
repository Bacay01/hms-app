import { assessVitals, bmi, parseVitalsForm } from "@/lib/vitals";

const form = (obj) => ({ get: (k) => obj[k] ?? "" });
const levels = (result) => result.flags.map((f) => `${f.field}:${f.level}`);

describe("parseVitalsForm", () => {
  it("accepts and rounds valid values", () => {
    const { data } = parseVitalsForm(form({ systolic: "120", diastolic: "80", temperature: "36.84" }));
    expect(data).toMatchObject({ systolic: 120, diastolic: 80, temperature: 36.8, pulse: null });
  });

  it("catches a typo like 370 °C", () => {
    expect(parseVitalsForm(form({ temperature: "370" })).error).toMatch(/Temperature/);
  });

  it("needs both BP numbers", () => {
    expect(parseVitalsForm(form({ systolic: "120" })).error).toMatch(/both/);
  });

  it("rejects systolic lower than diastolic", () => {
    expect(parseVitalsForm(form({ systolic: "70", diastolic: "90" })).error).toMatch(/higher/);
  });

  it("requires at least one measurement", () => {
    expect(parseVitalsForm(form({})).error).toMatch(/at least one/);
  });
});

describe("assessVitals (adults)", () => {
  it("flags nothing for normal readings", () => {
    const r = assessVitals({ systolic: 118, diastolic: 76, temperature: 36.8, pulse: 72, spo2: 98 }, 30);
    expect(r.flags).toEqual([]);
  });

  it("flags high and critical blood pressure", () => {
    expect(levels(assessVitals({ systolic: 150, diastolic: 95 }, 50))).toEqual(["bp:high"]);
    expect(levels(assessVitals({ systolic: 190, diastolic: 110 }, 50))).toEqual(["bp:critical"]);
  });

  it("flags fever and low oxygen together", () => {
    expect(levels(assessVitals({ temperature: 38.6, spo2: 91 }, 40))).toEqual(["temperature:high", "spo2:low"]);
  });

  it("does not flag children (different normal ranges)", () => {
    const r = assessVitals({ pulse: 130, respiratoryRate: 30 }, 4);
    expect(r).toEqual({ paediatric: true, flags: [] });
  });
});

describe("bmi", () => {
  it("calculates value and WHO category", () => {
    expect(bmi(70, 175)).toEqual({ value: 22.9, category: "Normal" });
    expect(bmi(95, 170)).toEqual({ value: 32.9, category: "Obese" });
  });

  it("returns null without both measurements", () => {
    expect(bmi(70, null)).toBeNull();
  });
});
