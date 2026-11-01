import { DRUG_BY_ID } from "@/lib/drugs";

export const FREQUENCIES = [
  { code: "OD", label: "Once daily", perDay: 1 },
  { code: "BD", label: "Twice daily", perDay: 2 },
  { code: "TDS", label: "Three times daily", perDay: 3 },
  { code: "QDS", label: "Four times daily", perDay: 4 },
  { code: "NOCTE", label: "At night", perDay: 1 },
  { code: "STAT", label: "Single dose (stat)", perDay: null },
];

export const units = (n, unit) => `${n} ${unit}${n === 1 ? "" : "s"}`;

// Total units the pharmacy dispenses: dose × times per day × days (rounded up)
export function calcQuantity(doseQty, frequency, days) {
  const f = FREQUENCIES.find((x) => x.code === frequency);
  if (!f || !(doseQty > 0)) return null;
  if (f.perDay === null) return Math.ceil(doseQty);
  return Math.ceil(doseQty * f.perDay * days);
}

// Words in a recorded allergy that match each drug class
const CLASS_ALLERGY_TERMS = {
  penicillin: ["penicillin", "amoxicillin", "ampicillin", "cloxacillin", "augmentin", "amoxil", "ampiclox"],
  cephalosporin: ["cephalosporin", "cefuroxime", "ceftriaxone", "cefixime", "zinnat"],
  sulfonamide: ["sulfa", "sulpha", "sulfonamide", "sulphonamide", "cotrimoxazole", "co-trimoxazole", "septrin", "bactrim"],
  nsaid: ["nsaid", "ibuprofen", "diclofenac", "aspirin", "brufen", "voltaren"],
  macrolide: ["macrolide", "azithromycin", "clarithromycin", "erythromycin"],
  fluoroquinolone: ["quinolone", "ciprofloxacin", "levofloxacin"],
  tetracycline: ["tetracycline", "doxycycline"],
};

// Classes where two items together are normal (e.g. iron + folic acid)
const NO_DUPLICATE_WARNING = new Set(["vitamin", "iron", "supplement", "rehydration"]);

// Returns [{ type: "allergy" | "interaction" | "duplicate", severity: "major" | "moderate", message }]
export function checkPrescription({ drug, currentDrugs, allergies }, graph) {
  const issues = [];
  const text = String(allergies ?? "").toLowerCase();

  if (text) {
    const terms = [...drug.generic, ...drug.aka, ...(CLASS_ALLERGY_TERMS[drug.cls] ?? [])];
    const hit = terms.find((t) => text.includes(t));
    if (hit) {
      issues.push({ type: "allergy", severity: "major", message: `Recorded allergy matches ${drug.name} ("${hit}").` });
    } else if (drug.cls === "cephalosporin" && CLASS_ALLERGY_TERMS.penicillin.some((t) => text.includes(t))) {
      issues.push({
        type: "allergy",
        severity: "moderate",
        message: "Penicillin allergy recorded — small risk of cross-reactivity with cephalosporins.",
      });
    }
  }

  for (const other of currentDrugs) {
    if (other.id === drug.id) {
      issues.push({ type: "duplicate", severity: "major", message: `${drug.name} is already prescribed on this visit.` });
      continue;
    }
    if (other.cls === drug.cls && !NO_DUPLICATE_WARNING.has(drug.cls)) {
      issues.push({ type: "duplicate", severity: "moderate", message: `Same class as ${other.name} (${drug.cls}) — check this is intended.` });
    }
    // One O(1) edge lookup per drug already prescribed
    const edge = graph.getEdge(drug.id, other.id);
    if (edge) issues.push({ type: "interaction", severity: edge.severity, message: `With ${other.name}: ${edge.effect}` });
  }

  return issues;
}

export function parsePrescriptionForm(formData) {
  const drug = DRUG_BY_ID.get(String(formData.get("drugId") || ""));
  if (!drug) return { error: "Choose a drug from the list." };

  const doseQty = Number(formData.get("doseQty"));
  if (!(doseQty >= 0.25 && doseQty <= 10)) return { error: "Dose must be between 0.25 and 10 units." };

  const frequency = String(formData.get("frequency") || "");
  if (!FREQUENCIES.some((f) => f.code === frequency)) return { error: "Choose how often." };

  let durationDays = Number.parseInt(String(formData.get("durationDays") || ""), 10);
  if (frequency === "STAT") durationDays = 1;
  if (!(durationDays >= 1 && durationDays <= 90)) return { error: "Duration must be between 1 and 90 days." };

  const instructions = String(formData.get("instructions") ?? "").trim().slice(0, 200) || null;
  const quantity = calcQuantity(doseQty, frequency, durationDays);

  return { data: { drug, doseQty, frequency, durationDays, quantity, instructions } };
}
