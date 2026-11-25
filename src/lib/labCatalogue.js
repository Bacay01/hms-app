// What each test measures, with reference ranges by sex and age.
// ILLUSTRATIVE common published ranges — a real lab validates its own for its analysers and population.
//
// Numeric ranges: each band applies FROM an age (years) onwards, for "ANY", "MALE" or "FEMALE".
// low/high may be null (e.g. "< 5.2"). critical = values needing an immediate call to the doctor.

const POS_NEG = { type: "choice", options: ["Negative", "Positive"], abnormal: ["Positive"] };
const REACTIVE = { type: "choice", options: ["Non-reactive", "Reactive"], abnormal: ["Reactive"] };
const DIPSTICK = { type: "choice", options: ["Negative", "Trace", "+", "++", "+++"], abnormal: ["+", "++", "+++"] };
const WIDAL = { type: "choice", options: ["< 1:80", "1:80", "1:160", "1:320"], abnormal: ["1:160", "1:320"] };

const num = (code, name, unit, min, max, ranges, critical) => ({ code, name, unit, type: "number", min, max, ranges, critical });
const any = (from, low, high) => ({ sex: "ANY", from, low, high });
const male = (from, low, high) => ({ sex: "MALE", from, low, high });
const female = (from, low, high) => ({ sex: "FEMALE", from, low, high });

const HB = num("HB", "Haemoglobin", "g/dL", 1, 25,
  [any(0, 11.0, 14.0), any(5, 11.5, 15.5), any(15, 12.0, 16.5), male(12, 12.0, 16.0), male(15, 13.0, 17.0), female(12, 12.0, 15.0)],
  { low: 7.0, high: 20.0 });
const PCV = num("PCV", "Packed cell volume (PCV)", "%", 5, 75,
  [any(0, 33, 43), any(15, 36, 50), male(15, 40, 50), female(15, 36, 46)],
  { low: 20 });

export const CATALOGUE = {
  "MP-RDT": [{ code: "MP_RDT", name: "Malaria antigen (P. falciparum)", ...POS_NEG }],
  "MP-FILM": [{ code: "MPS", name: "Malaria parasites", type: "choice", options: ["None seen", "+ (scanty)", "++", "+++"], abnormal: ["+ (scanty)", "++", "+++"] }],
  FBC: [
    HB,
    PCV,
    num("WBC", "White cell count", "×10⁹/L", 0.1, 200, [any(0, 5.0, 14.5), any(12, 4.0, 11.0)], { low: 2.0, high: 30 }),
    num("PLT", "Platelets", "×10⁹/L", 1, 2000, [any(0, 150, 400)], { low: 20, high: 1000 }),
    num("NEUT", "Neutrophils", "%", 0, 100, [any(0, 40, 75)]),
    num("LYMPH", "Lymphocytes", "%", 0, 100, [any(0, 20, 45)]),
  ],
  PCV: [PCV],
  ESR: [num("ESR", "ESR", "mm/hr", 0, 150, [any(0, 0, 10), male(15, 0, 15), female(15, 0, 20)])],
  GENOTYPE: [{ code: "HBGENO", name: "Haemoglobin genotype", type: "choice", options: ["AA", "AS", "AC", "SS", "SC", "CC"], abnormal: ["SS", "SC", "CC"] }],
  "BLOOD-GROUP": [{ code: "ABO", name: "Blood group", type: "choice", options: ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"] }],
  URINALYSIS: [
    { code: "U_GLU", name: "Glucose", ...DIPSTICK },
    { code: "U_PRO", name: "Protein", ...DIPSTICK },
    { code: "U_BLD", name: "Blood", ...DIPSTICK },
    { code: "U_LEU", name: "Leukocytes", ...DIPSTICK },
    { code: "U_NIT", name: "Nitrite", ...POS_NEG },
  ],
  "URINE-MCS": [
    { code: "CULTURE", name: "Culture", type: "text" },
    { code: "SENS", name: "Sensitivity", type: "text" },
  ],
  WIDAL: [
    { code: "TYPHI_O", name: "S. Typhi O", ...WIDAL },
    { code: "TYPHI_H", name: "S. Typhi H", ...WIDAL },
  ],
  "SPUTUM-TB": [{
    code: "MTB",
    name: "GeneXpert MTB/RIF",
    type: "choice",
    options: ["MTB not detected", "MTB detected, RIF resistance not detected", "MTB detected, RIF resistance detected"],
    abnormal: ["MTB detected, RIF resistance not detected", "MTB detected, RIF resistance detected"],
  }],
  RBS: [num("GLU", "Glucose (random)", "mmol/L", 0.5, 50, [any(0, 3.9, 7.8)], { low: 2.8, high: 25 })],
  FBS: [num("GLU", "Glucose (fasting)", "mmol/L", 0.5, 50, [any(0, 3.9, 5.5)], { low: 2.8, high: 25 })],
  HBA1C: [num("HBA1C", "HbA1c", "%", 2, 20, [any(0, 4.0, 5.6)])],
  EUCR: [
    num("NA", "Sodium", "mmol/L", 90, 200, [any(0, 135, 145)], { low: 120, high: 160 }),
    num("K", "Potassium", "mmol/L", 1, 10, [any(0, 3.5, 5.0)], { low: 2.5, high: 6.5 }),
    num("CL", "Chloride", "mmol/L", 60, 140, [any(0, 98, 107)]),
    num("HCO3", "Bicarbonate", "mmol/L", 2, 50, [any(0, 22, 29)]),
    num("UREA", "Urea", "mmol/L", 0.5, 100, [any(0, 2.5, 7.8)]),
    num("CREAT", "Creatinine", "µmol/L", 10, 3000, [any(0, 44, 106), male(15, 62, 106), female(15, 44, 80)]),
  ],
  LFT: [
    num("ALT", "ALT", "U/L", 1, 5000, [any(0, 7, 56)]),
    num("AST", "AST", "U/L", 1, 5000, [any(0, 10, 40)]),
    num("ALP", "ALP", "U/L", 5, 3000, [any(0, 44, 147)]),
    num("TBIL", "Total bilirubin", "µmol/L", 1, 800, [any(0, 5, 21)]),
    num("ALB", "Albumin", "g/L", 5, 70, [any(0, 35, 50)]),
  ],
  LIPID: [
    num("TC", "Total cholesterol", "mmol/L", 0.5, 20, [any(0, null, 5.2)]),
    num("TG", "Triglycerides", "mmol/L", 0.1, 50, [any(0, null, 1.7)]),
    num("HDL", "HDL cholesterol", "mmol/L", 0.1, 5, [any(0, 1.0, null), female(15, 1.2, null)]),
    num("LDL", "LDL cholesterol", "mmol/L", 0.1, 15, [any(0, null, 3.4)]),
  ],
  CRP: [num("CRP", "C-reactive protein", "mg/L", 0, 500, [any(0, null, 10)])],
  HIV: [{ code: "HIV", name: "HIV 1 & 2 antibodies (screening)", ...REACTIVE }],
  HBSAG: [{ code: "HBSAG", name: "HBsAg", ...REACTIVE }],
  HCV: [{ code: "HCV", name: "HCV antibody", ...REACTIVE }],
  VDRL: [{ code: "VDRL", name: "VDRL", ...REACTIVE }],
  "H-PYLORI": [{ code: "HPYL", name: "H. pylori", ...POS_NEG }],
  PREG: [{ code: "HCG", name: "Urine hCG", type: "choice", options: ["Negative", "Positive"] }],
  STOOL: [{ code: "STOOL", name: "Stool microscopy", type: "text" }],
};

// Any test without an entry gets a single free-text result
export function analytesFor(testCode) {
  return CATALOGUE[testCode] ?? [{ code: "RESULT", name: "Result", type: "text" }];
}
