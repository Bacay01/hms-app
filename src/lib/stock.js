import { DRUG_BY_ID } from "@/lib/drugs";
import { nairaToKobo } from "@/lib/money";

export const NEAR_EXPIRY_DAYS = 90;

// Whole days from today to a "YYYY-MM-DD" date (negative = already expired)
export function daysUntil(dateStr, today) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86_400_000);
}

export function addDays(today, days) {
  const [y, m, d] = today.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// Reorder level: when usable stock falls below this, it's LOW
export const reorderLevelFor = (drug) => (drug.unit === "sachet" ? 20 : 100);

// One O(n) pass with a Map: usable (unexpired) stock, expired stock, near-expiry, next expiry, alert flags
export function summariseStock(drugs, batches, today) {
  const byDrug = new Map(drugs.map((d) => [d.id, { drug: d, usable: 0, expired: 0, nearExpiry: 0, batches: 0, nextExpiry: null }]));

  for (const b of batches) {
    const s = byDrug.get(b.drugId);
    if (!s || b.quantityOnHand <= 0) continue;
    s.batches++;
    const days = daysUntil(b.expiryDate, today);
    if (days < 0) {
      s.expired += b.quantityOnHand; // still on the shelf, but NOT usable stock
      continue;
    }
    s.usable += b.quantityOnHand;
    if (days <= NEAR_EXPIRY_DAYS) s.nearExpiry += b.quantityOnHand;
    if (!s.nextExpiry || b.expiryDate < s.nextExpiry) s.nextExpiry = b.expiryDate;
  }

  return [...byDrug.values()].map((s) => {
    const reorder = reorderLevelFor(s.drug);
    const flags = [];
    if (s.usable === 0) flags.push("OUT");
    else if (s.usable < reorder) flags.push("LOW");
    if (s.nearExpiry > 0) flags.push("EXPIRING");
    if (s.expired > 0) flags.push("EXPIRED");
    return { ...s, reorder, flags };
  });
}

const BATCH_RE = /^[A-Za-z0-9][A-Za-z0-9\-/]{1,29}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseBatchForm(formData, today) {
  const drug = DRUG_BY_ID.get(String(formData.get("drugId") || ""));
  if (!drug) return { error: "Choose a drug." };

  const batchNumber = String(formData.get("batchNumber") || "").trim().toUpperCase();
  if (!BATCH_RE.test(batchNumber)) return { error: "Batch number: 2–30 letters, numbers, - or /, as printed on the pack." };

  const expiryDate = String(formData.get("expiryDate") || "");
  if (!DATE_RE.test(expiryDate)) return { error: "Enter the expiry date." };
  if (daysUntil(expiryDate, today) < 0) return { error: "That batch has already expired — it can't be received." };

  const quantity = Number.parseInt(String(formData.get("quantity") || ""), 10);
  if (!(quantity >= 1 && quantity <= 100_000)) return { error: `Quantity must be between 1 and 100,000 ${drug.unit}s.` };

  const costRaw = String(formData.get("cost") || "").trim();
  const costKobo = costRaw ? nairaToKobo(costRaw) : null;
  if (costRaw && costKobo === null) return { error: "Enter a valid cost per unit, e.g. 12.50" };

  const supplier = String(formData.get("supplier") || "").trim().slice(0, 80) || null;
  return { data: { drug, batchNumber, expiryDate, quantity, costKobo, supplier } };
}
