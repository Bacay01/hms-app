// What the HMO pays on one bill line. Rounded DOWN to the kobo — the patient covers any fraction.
// coverage: Map(category → { percent, requiresPreauth }) or null (no valid enrolment)
export function itemCoverage(item, coverage) {
  if (item.status !== "ACTIVE" || item.amountKobo <= 0 || !coverage) return { hmoKobo: 0, preauthRequired: false };
  const c = coverage.get(item.category);
  if (!c || c.percent <= 0) return { hmoKobo: 0, preauthRequired: false };
  if (c.requiresPreauth && !item.preauthCode) return { hmoKobo: 0, preauthRequired: true }; // patient-pays until authorized
  return { hmoKobo: Math.floor((item.amountKobo * c.percent) / 100), preauthRequired: c.requiresPreauth };
}

// Gross, HMO share and patient share for a whole bill (discount lines reduce the patient's share)
export function splitBill(items, coverage) {
  let grossKobo = 0;
  let hmoKobo = 0;
  const perItem = new Map();
  for (const item of items) {
    const r = itemCoverage(item, coverage);
    perItem.set(item.id, r);
    if (item.status === "ACTIVE") {
      grossKobo += item.amountKobo;
      hmoKobo += r.hmoKobo;
    }
  }
  return { grossKobo, hmoKobo, patientKobo: grossKobo - hmoKobo, perItem };
}

// An enrolment covers a visit only if it's active and not past its valid-until date
export function enrolmentValid(link, visitDate) {
  if (!link || !link.isActive) return false;
  return !link.validUntil || link.validUntil >= visitDate;
}

export function nextMonth(month) {
  const [y, m] = month.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}
