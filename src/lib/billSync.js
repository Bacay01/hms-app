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

// labs/prescriptions: the NON-cancelled ones · prices: Map code → { name, priceKobo }
// bedLines: from bedChargeLines() — one line per bed stay, priced at the ward rate snapshot
export function desiredItems({ encounter, labs, prescriptions, prices, bedLines = [] }) {
  const items = [];
  if (!NOT_BILLABLE_VISIT.has(encounter.status)) {
    items.push(line("CONSULTATION", encounter.id, priceCode.consultation(encounter), "CONSULTATION", "Consultation", 1, prices));
  }
  for (const l of labs) items.push(line("LAB", l.id, priceCode.lab(l), "LAB", l.testName, 1, prices));
  for (const rx of prescriptions) {
    items.push(line("PRESCRIPTION", rx.id, priceCode.drug(rx), "DRUG", rx.drugName, rx.quantity, prices));
  }
  for (const b of bedLines) {
    items.push({
      sourceType: "BED",
      sourceId: b.stayId,
      serviceCode: "BED",
      description: `Bed — ${b.wardName} (per night)`,
      category: "BED",
      unitPriceKobo: b.rateKobo,
      quantity: b.nights,
      amountKobo: b.rateKobo * b.nights,
      priceMissing: false,
    });
  }
  return items;
}

// Map-based diff, O(n): what to add, void, price, or update (bed nights grow each day)
export function diffBillItems(existing, desired) {
  const key = (i) => `${i.sourceType}:${i.sourceId}`;
  const have = new Map(existing.map((i) => [key(i), i]));
  const want = new Map(desired.map((i) => [key(i), i]));

  const toCreate = [];
  const toReprice = [];
  const toUpdate = [];
  for (const [k, d] of want) {
    const h = have.get(k);
    if (!h) toCreate.push(d);
    else if (h.status === "ACTIVE" && h.priceMissing && !d.priceMissing) {
      toReprice.push({ id: h.id, description: d.description, unitPriceKobo: d.unitPriceKobo, amountKobo: d.amountKobo });
    } else if (h.status === "ACTIVE" && h.sourceType === "BED" && (h.quantity !== d.quantity || h.unitPriceKobo !== d.unitPriceKobo)) {
      toUpdate.push({ id: h.id, quantity: d.quantity, unitPriceKobo: d.unitPriceKobo, amountKobo: d.amountKobo });
    }
  }

  // Approved discounts are not orders, so the sync never voids them
  const toVoid = existing.filter((i) => i.status === "ACTIVE" && i.sourceType !== "DISCOUNT" && !want.has(key(i)));
  return { toCreate, toVoid, toReprice, toUpdate };
}

export const billTotal = (items) => items.filter((i) => i.status !== "VOIDED").reduce((sum, i) => sum + i.amountKobo, 0);
