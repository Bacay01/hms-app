import { addDays, daysUntil, parseBatchForm, summariseStock } from "@/lib/stock";

const today = "2026-11-26";
const tablet = { id: "pcm", unit: "tablet" };
const form = (obj) => ({ get: (k) => obj[k] ?? "" });

describe("dates", () => {
  it("counts days to expiry, negative once expired", () => {
    expect(daysUntil("2026-12-26", today)).toBe(30);
    expect(daysUntil("2026-11-25", today)).toBe(-1);
    expect(addDays(today, 60)).toBe("2027-01-25");
  });
});

describe("summariseStock", () => {
  it("counts only unexpired batches as usable stock", () => {
    const [s] = summariseStock([tablet], [
      { drugId: "pcm", expiryDate: "2027-06-01", quantityOnHand: 150 },
      { drugId: "pcm", expiryDate: "2026-11-20", quantityOnHand: 40 }, // expired last week
    ], today);
    expect(s).toMatchObject({ usable: 150, expired: 40, nextExpiry: "2027-06-01" });
    expect(s.flags).toEqual(["EXPIRED"]);
  });

  it("flags out of stock, low and expiring", () => {
    const out = summariseStock([tablet], [], today)[0];
    expect(out.flags).toEqual(["OUT"]);

    const low = summariseStock([tablet], [{ drugId: "pcm", expiryDate: "2027-06-01", quantityOnHand: 30 }], today)[0];
    expect(low.flags).toEqual(["LOW"]);

    const expiring = summariseStock([tablet], [{ drugId: "pcm", expiryDate: "2027-01-10", quantityOnHand: 300 }], today)[0];
    expect(expiring.flags).toEqual(["EXPIRING"]);
  });
});

describe("parseBatchForm", () => {
  const good = { drugId: "paracetamol-500", batchNumber: "emz2611", expiryDate: "2028-01-31", quantity: "500", cost: "12.50" };

  it("accepts a valid delivery and normalises the batch number", () => {
    const { data } = parseBatchForm(form(good), today);
    expect(data).toMatchObject({ batchNumber: "EMZ2611", quantity: 500, costKobo: 1250 });
  });

  it("refuses an expired batch", () => {
    expect(parseBatchForm(form({ ...good, expiryDate: "2026-10-01" }), today).error).toMatch(/expired/);
  });

  it("refuses silly quantities", () => {
    expect(parseBatchForm(form({ ...good, quantity: "0" }), today).error).toMatch(/Quantity/);
  });
});
