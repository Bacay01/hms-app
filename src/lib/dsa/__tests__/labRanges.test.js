import { CATALOGUE } from "@/lib/labCatalogue";
import { evaluateResult, findRange, parseResult } from "@/lib/labRanges";

const HB = CATALOGUE.FBC.find((a) => a.code === "HB");
const K = CATALOGUE.EUCR.find((a) => a.code === "K");
const RDT = CATALOGUE["MP-RDT"][0];

describe("findRange (binary search over age bands)", () => {
  it("picks the adult range for each sex", () => {
    expect(findRange(HB.ranges, "MALE", 40)).toMatchObject({ low: 13.0, high: 17.0 });
    expect(findRange(HB.ranges, "FEMALE", 30)).toMatchObject({ low: 12.0, high: 15.0 });
  });

  it("picks the right childhood band", () => {
    expect(findRange(HB.ranges, "MALE", 3)).toMatchObject({ low: 11.0, high: 14.0 });
    expect(findRange(HB.ranges, "FEMALE", 8)).toMatchObject({ low: 11.5, high: 15.5 });
  });

  it("uses the teenage band before the adult one", () => {
    expect(findRange(HB.ranges, "MALE", 13)).toMatchObject({ low: 12.0, high: 16.0 });
  });
});

describe("evaluateResult", () => {
  const adultMan = { sex: "MALE", age: 40 };

  it("flags low and high against the patient's own range", () => {
    expect(evaluateResult(HB, "11.2", adultMan).flag).toBe("LOW");
    expect(evaluateResult(HB, "11.8", { sex: "FEMALE", age: 8 }).flag).toBeNull(); // normal for an 8-year-old…
    expect(evaluateResult(HB, "11.8", { sex: "FEMALE", age: 30 }).flag).toBe("LOW"); // …but low for a woman
    expect(evaluateResult(HB, "18.0", adultMan).flag).toBe("HIGH");
  });

  it("flags critical values first", () => {
    expect(evaluateResult(HB, "6.1", adultMan).flag).toBe("CRITICAL_LOW");
    expect(evaluateResult(K, "6.9", adultMan).flag).toBe("CRITICAL_HIGH");
  });

  it("keeps a snapshot of the range used", () => {
    expect(evaluateResult(HB, "14", adultMan)).toMatchObject({ flag: null, refLow: 13, refHigh: 17, refText: "13–17" });
  });

  it("flags abnormal choices", () => {
    expect(evaluateResult(RDT, "Positive", adultMan)).toMatchObject({ flag: "ABNORMAL", refText: "Negative" });
    expect(evaluateResult(RDT, "Negative", adultMan).flag).toBeNull();
  });
});

describe("parseResult", () => {
  it("catches a typo like Hb 120", () => {
    expect(parseResult(HB, "120").error).toMatch(/typo/);
    expect(parseResult(HB, "12.0")).toEqual({ value: "12.0", number: 12 });
  });

  it("only accepts listed options", () => {
    expect(parseResult(RDT, "Maybe").error).toMatch(/valid option/);
  });
});
