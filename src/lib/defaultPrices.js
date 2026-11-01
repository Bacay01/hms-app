import { DRUGS } from "@/lib/drugs";
import { LAB_TESTS } from "@/lib/labTests";

// ILLUSTRATIVE prices for a private clinic — the Admin sets the real ones on the Price list page.
const kobo = (naira) => naira * 100;

const CONSULTATIONS = [
  { code: "CONSULT-NEW", name: "Consultation — new patient", naira: 5000 },
  { code: "CONSULT-FOLLOW_UP", name: "Consultation — follow-up", naira: 3000 },
  { code: "CONSULT-REVIEW", name: "Consultation — review", naira: 2000 },
  { code: "CONSULT-ANTENATAL", name: "Antenatal consultation", naira: 4000 },
  { code: "CONSULT-EMERGENCY", name: "Emergency consultation", naira: 10000 },
];

const LAB_NAIRA = {
  "MP-RDT": 2000, "MP-FILM": 2500, STOOL: 2500, FBC: 5000, PCV: 1500, ESR: 2000, GENOTYPE: 3000,
  "BLOOD-GROUP": 2000, URINALYSIS: 2000, "URINE-MCS": 6000, WIDAL: 2500, "SPUTUM-TB": 8000, RBS: 1500,
  FBS: 1500, HBA1C: 9000, EUCR: 10000, LFT: 10000, LIPID: 10000, CRP: 7000, HIV: 3000, HBSAG: 3000,
  HCV: 3500, VDRL: 3000, "H-PYLORI": 5000, PREG: 1500,
};

// Per tablet / capsule / sachet
const DRUG_NAIRA = {
  "paracetamol-500": 20, "ibuprofen-400": 50, "diclofenac-50": 50, "aspirin-75": 30, "tramadol-50": 150,
  "artemether-lumefantrine": 250, "proguanil-100": 100, "amoxicillin-500": 100, "amoxiclav-625": 600,
  "ampiclox-500": 120, "cefuroxime-500": 500, "ciprofloxacin-500": 150, "azithromycin-500": 600,
  "clarithromycin-500": 600, "metronidazole-400": 50, "cotrimoxazole-960": 60, "doxycycline-100": 100,
  "fluconazole-150": 800, "albendazole-400": 500, "amlodipine-5": 80, "nifedipine-20": 100,
  "lisinopril-10": 100, "losartan-50": 150, "hydrochlorothiazide-25": 50, "spironolactone-25": 150,
  "methyldopa-250": 80, "simvastatin-20": 150, "warfarin-5": 150, "metformin-500": 50,
  "glibenclamide-5": 40, "omeprazole-20": 100, "loratadine-10": 100, "chlorphenamine-4": 20,
  "prednisolone-5": 30, "carbamazepine-200": 100, "fluoxetine-20": 150, "hydroxyurea-500": 400,
  "folic-acid-5": 20, "ferrous-sulphate-200": 20, "zinc-20": 50, "ors-sachet": 300,
};

export function defaultPriceList() {
  return [
    ...CONSULTATIONS.map((c) => ({ code: c.code, name: c.name, category: "CONSULTATION", unit: "visit", priceKobo: kobo(c.naira) })),
    ...LAB_TESTS.map((t) => ({ code: `LAB-${t.code}`, name: t.name, category: "LAB", unit: "test", priceKobo: kobo(LAB_NAIRA[t.code] ?? 0) })),
    ...DRUGS.map((d) => ({ code: `DRUG-${d.id}`, name: d.name, category: "DRUG", unit: d.unit, priceKobo: kobo(DRUG_NAIRA[d.id] ?? 0) })),
  ];
}
