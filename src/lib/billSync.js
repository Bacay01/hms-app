// Works out what a visit SHOULD be billed for, and how that differs from the bill as it stands.
// Pure functions — no database — so they are unit-tested.

const NOT_BILLABLE_VISIT = new Set(["CANCELLED", "LEFT"]); // left without being seen → no consultation fee

export const priceCode = {
  consultation: (e) => (e.priority === "EMERGENCY" ? "CONSULT-EMERGENCY" : `CONSULT-${e.visitType}`),
  lab: (l) => `LAB-${l.testCode}`,
  drug: (rx) => `DRUG-${rx.drugId}`,
};

function line(sourceType, sourceId, code, category, fallbackName, quantity, prices) {
  const price = prices.get(code);
  const unit = price ? price.priceKobo : 0;
  return {
    sourceType,
    sourceId,
    serviceCode: code,
    description: price?.name ?? fallbackName,
    category,
    unitPriceKobo: unit,
    quantity,
    amountKobo: unit * quantity,
    priceMissing: !price,
  };
}

// labs and prescriptions passed in are the NON-cancelled ones; prices: Map code → { name, priceKobo }
export function desiredItems({ encounter, labs, prescriptions, prices }) {
  const items = [];
  if (!NOT_BILLABLE_VISIT.has(encounter.status)) {
    items.push(line("CONSULTATION", encounter.id, priceCode.consultation(encounter), "CONSULTATION", "Consultation", 1, prices));
  }
  for (const l of labs) items.push(line("LAB", l.id, priceCode.lab(l), "LAB", l.testName, 1, prices));
  for (const rx of prescriptions) {
    items.push(line("PRESCRIPTION", rx.id, priceCode.drug(rx), "DRUG", rx.drugName, rx.quantity, prices));
  }
  return items;
}

// Map-based diff, O(n): what to add, what to void, what can now be priced
export function diffBillItems(existing, desired) {
  const key = (i) => `${i.sourceType}:${i.sourceId}`;
  const have = new Map(existing.map((i) => [key(i), i]));
  const want = new Map(desired.map((i) => [key(i), i]));

  const toCreate = [];
  const toReprice = [];
  for (const [k, d] of want) {
    const h = have.get(k);
    if (!h) toCreate.push(d);
    else if (h.status === "ACTIVE" && h.priceMissing && !d.priceMissing) {
      toReprice.push({ id: h.id, description: d.description, unitPriceKobo: d.unitPriceKobo, amountKobo: d.amountKobo });
    }
  }

  // Approved discounts are not orders, so the sync never voids them
  const toVoid = existing.filter((i) => i.status === "ACTIVE" && i.sourceType !== "DISCOUNT" && !want.has(key(i)));
  return { toCreate, toVoid, toReprice };
}

export const billTotal = (items) => items.filter((i) => i.status !== "VOIDED").reduce((sum, i) => sum + i.amountKobo, 0);
