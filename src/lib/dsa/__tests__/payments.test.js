import { allocatePayments, nairaInWords } from "@/lib/payments";

const item = (sourceId, amountKobo, priceMissing = false) => ({ sourceId, amountKobo, priceMissing });
const items = [item("consult", 500000), item("coartem", 600000), item("pcm", 36000)];
const asObject = (map) => Object.fromEntries(map);

describe("allocatePayments (FIFO)", () => {
  it("marks everything paid when the bill is paid in full", () => {
    expect(asObject(allocatePayments(items, 1136000))).toEqual({ consult: "PAID", coartem: "PAID", pcm: "PAID" });
  });

  it("covers items in order: paid, part-paid, unpaid", () => {
    expect(asObject(allocatePayments(items, 800000))).toEqual({ consult: "PAID", coartem: "PART", pcm: "UNPAID" });
  });

  it("leaves everything unpaid when nothing is paid", () => {
    expect(asObject(allocatePayments(items, 0))).toEqual({ consult: "UNPAID", coartem: "UNPAID", pcm: "UNPAID" });
  });

  it("never marks an unpriced item as paid", () => {
    expect(asObject(allocatePayments([item("x", 0, true)], 999999))).toEqual({ x: "UNPAID" });
  });
});

describe("nairaInWords (recursion)", () => {
  it("writes thousands and hundreds", () => {
    expect(nairaInWords(886000)).toBe("Eight thousand, eight hundred and sixty naira only");
  });

  it("uses 'and' before a small remainder", () => {
    expect(nairaInWords(105000)).toBe("One thousand and fifty naira only");
  });

  it("includes kobo", () => {
    expect(nairaInWords(150050)).toBe("One thousand, five hundred naira, fifty kobo only");
    expect(nairaInWords(21)).toBe("Zero naira, twenty-one kobo only");
  });

  it("handles millions", () => {
    expect(nairaInWords(1_000_000_000)).toBe("Ten million naira only");
  });

  it("handles hyphenated tens", () => {
    expect(nairaInWords(4_525_000)).toBe("Forty-five thousand, two hundred and fifty naira only");
  });
});
