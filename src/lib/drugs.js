import { Graph } from "@/lib/dsa/Graph";

// A realistic but ILLUSTRATIVE outpatient formulary. A real hospital would use its own formulary
// and a licensed interaction database, reviewed by a pharmacist.
// generic = ingredient names (for allergy matching) · aka = brand / everyday names (for search)
export const DRUGS = [
  { id: "paracetamol-500", name: "Paracetamol 500 mg tablet", generic: ["paracetamol"], cls: "analgesic", unit: "tablet", aka: ["pcm", "panadol", "emzor"] },
  { id: "ibuprofen-400", name: "Ibuprofen 400 mg tablet", generic: ["ibuprofen"], cls: "nsaid", unit: "tablet", aka: ["brufen"] },
  { id: "diclofenac-50", name: "Diclofenac 50 mg tablet", generic: ["diclofenac"], cls: "nsaid", unit: "tablet", aka: ["voltaren", "cataflam"] },
  { id: "aspirin-75", name: "Aspirin 75 mg tablet", generic: ["aspirin"], cls: "nsaid", unit: "tablet", aka: ["low dose aspirin"] },
  { id: "tramadol-50", name: "Tramadol 50 mg capsule", generic: ["tramadol"], cls: "opioid", unit: "capsule", aka: [] },
  { id: "artemether-lumefantrine", name: "Artemether/Lumefantrine 20/120 mg tablet", generic: ["artemether", "lumefantrine"], cls: "antimalarial", unit: "tablet", aka: ["coartem", "act", "lonart"] },
  { id: "proguanil-100", name: "Proguanil 100 mg tablet", generic: ["proguanil"], cls: "antimalarial", unit: "tablet", aka: ["paludrine"] },
  { id: "amoxicillin-500", name: "Amoxicillin 500 mg capsule", generic: ["amoxicillin"], cls: "penicillin", unit: "capsule", aka: ["amoxil"] },
  { id: "amoxiclav-625", name: "Amoxicillin/Clavulanate 625 mg tablet", generic: ["amoxicillin", "clavulanate"], cls: "penicillin", unit: "tablet", aka: ["augmentin"] },
  { id: "ampiclox-500", name: "Ampicillin/Cloxacillin 500 mg capsule", generic: ["ampicillin", "cloxacillin"], cls: "penicillin", unit: "capsule", aka: ["ampiclox"] },
  { id: "cefuroxime-500", name: "Cefuroxime 500 mg tablet", generic: ["cefuroxime"], cls: "cephalosporin", unit: "tablet", aka: ["zinnat"] },
  { id: "ciprofloxacin-500", name: "Ciprofloxacin 500 mg tablet", generic: ["ciprofloxacin"], cls: "fluoroquinolone", unit: "tablet", aka: ["cipro"] },
  { id: "azithromycin-500", name: "Azithromycin 500 mg tablet", generic: ["azithromycin"], cls: "macrolide", unit: "tablet", aka: ["zithromax"] },
  { id: "clarithromycin-500", name: "Clarithromycin 500 mg tablet", generic: ["clarithromycin"], cls: "macrolide", unit: "tablet", aka: ["klacid"] },
  { id: "metronidazole-400", name: "Metronidazole 400 mg tablet", generic: ["metronidazole"], cls: "nitroimidazole", unit: "tablet", aka: ["flagyl"] },
  { id: "cotrimoxazole-960", name: "Co-trimoxazole 960 mg tablet", generic: ["sulfamethoxazole", "trimethoprim"], cls: "sulfonamide", unit: "tablet", aka: ["septrin", "bactrim"] },
  { id: "doxycycline-100", name: "Doxycycline 100 mg capsule", generic: ["doxycycline"], cls: "tetracycline", unit: "capsule", aka: [] },
  { id: "fluconazole-150", name: "Fluconazole 150 mg capsule", generic: ["fluconazole"], cls: "antifungal", unit: "capsule", aka: ["diflucan"] },
  { id: "albendazole-400", name: "Albendazole 400 mg tablet", generic: ["albendazole"], cls: "anthelmintic", unit: "tablet", aka: ["zentel", "dewormer"] },
  { id: "amlodipine-5", name: "Amlodipine 5 mg tablet", generic: ["amlodipine"], cls: "calcium-channel-blocker", unit: "tablet", aka: ["norvasc"] },
  { id: "nifedipine-20", name: "Nifedipine 20 mg retard tablet", generic: ["nifedipine"], cls: "calcium-channel-blocker", unit: "tablet", aka: [] },
  { id: "lisinopril-10", name: "Lisinopril 10 mg tablet", generic: ["lisinopril"], cls: "ace-inhibitor", unit: "tablet", aka: [] },
  { id: "losartan-50", name: "Losartan 50 mg tablet", generic: ["losartan"], cls: "arb", unit: "tablet", aka: ["cozaar"] },
  { id: "hydrochlorothiazide-25", name: "Hydrochlorothiazide 25 mg tablet", generic: ["hydrochlorothiazide"], cls: "thiazide", unit: "tablet", aka: ["hctz"] },
  { id: "spironolactone-25", name: "Spironolactone 25 mg tablet", generic: ["spironolactone"], cls: "potassium-sparing-diuretic", unit: "tablet", aka: ["aldactone"] },
  { id: "methyldopa-250", name: "Methyldopa 250 mg tablet", generic: ["methyldopa"], cls: "centrally-acting-antihypertensive", unit: "tablet", aka: ["aldomet"] },
  { id: "simvastatin-20", name: "Simvastatin 20 mg tablet", generic: ["simvastatin"], cls: "statin", unit: "tablet", aka: [] },
  { id: "warfarin-5", name: "Warfarin 5 mg tablet", generic: ["warfarin"], cls: "anticoagulant", unit: "tablet", aka: [] },
  { id: "metformin-500", name: "Metformin 500 mg tablet", generic: ["metformin"], cls: "biguanide", unit: "tablet", aka: ["glucophage"] },
  { id: "glibenclamide-5", name: "Glibenclamide 5 mg tablet", generic: ["glibenclamide"], cls: "sulfonylurea", unit: "tablet", aka: ["daonil"] },
  { id: "omeprazole-20", name: "Omeprazole 20 mg capsule", generic: ["omeprazole"], cls: "proton-pump-inhibitor", unit: "capsule", aka: [] },
  { id: "loratadine-10", name: "Loratadine 10 mg tablet", generic: ["loratadine"], cls: "antihistamine", unit: "tablet", aka: ["clarityn"] },
  { id: "chlorphenamine-4", name: "Chlorphenamine 4 mg tablet", generic: ["chlorphenamine"], cls: "antihistamine", unit: "tablet", aka: ["piriton"] },
  { id: "prednisolone-5", name: "Prednisolone 5 mg tablet", generic: ["prednisolone"], cls: "corticosteroid", unit: "tablet", aka: [] },
  { id: "carbamazepine-200", name: "Carbamazepine 200 mg tablet", generic: ["carbamazepine"], cls: "anticonvulsant", unit: "tablet", aka: ["tegretol"] },
  { id: "fluoxetine-20", name: "Fluoxetine 20 mg capsule", generic: ["fluoxetine"], cls: "ssri", unit: "capsule", aka: ["prozac"] },
  { id: "hydroxyurea-500", name: "Hydroxyurea 500 mg capsule", generic: ["hydroxyurea", "hydroxycarbamide"], cls: "antimetabolite", unit: "capsule", aka: [] },
  { id: "folic-acid-5", name: "Folic acid 5 mg tablet", generic: ["folic acid"], cls: "vitamin", unit: "tablet", aka: ["folate"] },
  { id: "ferrous-sulphate-200", name: "Ferrous sulphate 200 mg tablet", generic: ["ferrous sulphate"], cls: "iron", unit: "tablet", aka: ["iron", "fefol"] },
  { id: "zinc-20", name: "Zinc sulphate 20 mg tablet", generic: ["zinc"], cls: "supplement", unit: "tablet", aka: [] },
  { id: "ors-sachet", name: "Oral rehydration salts (ORS) sachet", generic: ["oral rehydration salts"], cls: "rehydration", unit: "sachet", aka: ["ors"] },
];

export const DRUG_BY_ID = new Map(DRUGS.map((d) => [d.id, d]));

// "class:xyz" means every drug in that class — expanded into individual edges
export const INTERACTIONS = [
  { a: "warfarin-5", b: "class:nsaid", severity: "major", effect: "Greatly increased bleeding risk." },
  { a: "warfarin-5", b: "metronidazole-400", severity: "major", effect: "Raises warfarin effect — bleeding risk; monitor INR." },
  { a: "warfarin-5", b: "ciprofloxacin-500", severity: "major", effect: "Raises warfarin effect — bleeding risk; monitor INR." },
  { a: "warfarin-5", b: "cotrimoxazole-960", severity: "major", effect: "Raises warfarin effect — bleeding risk; monitor INR." },
  { a: "warfarin-5", b: "fluconazole-150", severity: "major", effect: "Raises warfarin effect — bleeding risk; monitor INR." },
  { a: "warfarin-5", b: "clarithromycin-500", severity: "major", effect: "Raises warfarin effect — bleeding risk; monitor INR." },
  { a: "simvastatin-20", b: "clarithromycin-500", severity: "major", effect: "Risk of severe muscle damage (rhabdomyolysis) — avoid together." },
  { a: "simvastatin-20", b: "amlodipine-5", severity: "moderate", effect: "Raises simvastatin levels — keep simvastatin at 20 mg or less." },
  { a: "simvastatin-20", b: "fluconazole-150", severity: "moderate", effect: "Raises simvastatin levels — risk of muscle pain or damage." },
  { a: "class:ace-inhibitor", b: "spironolactone-25", severity: "major", effect: "Risk of dangerously high potassium (hyperkalaemia)." },
  { a: "class:arb", b: "spironolactone-25", severity: "major", effect: "Risk of dangerously high potassium (hyperkalaemia)." },
  { a: "class:ace-inhibitor", b: "class:arb", severity: "major", effect: "Dual blockade — kidney injury and high potassium; avoid combining." },
  { a: "class:ace-inhibitor", b: "class:nsaid", severity: "moderate", effect: "Reduces the blood-pressure effect and may harm the kidneys." },
  { a: "class:arb", b: "class:nsaid", severity: "moderate", effect: "Reduces the blood-pressure effect and may harm the kidneys." },
  { a: "ciprofloxacin-500", b: "ferrous-sulphate-200", severity: "moderate", effect: "Iron blocks absorption — take ciprofloxacin 2 hours before or 6 hours after." },
  { a: "ciprofloxacin-500", b: "zinc-20", severity: "moderate", effect: "Zinc blocks absorption — separate the doses." },
  { a: "doxycycline-100", b: "ferrous-sulphate-200", severity: "moderate", effect: "Iron blocks absorption — separate the doses by 2–3 hours." },
  { a: "doxycycline-100", b: "zinc-20", severity: "moderate", effect: "Zinc blocks absorption — separate the doses." },
  { a: "glibenclamide-5", b: "cotrimoxazole-960", severity: "moderate", effect: "Increased risk of low blood sugar." },
  { a: "glibenclamide-5", b: "fluconazole-150", severity: "moderate", effect: "Increased risk of low blood sugar." },
  { a: "carbamazepine-200", b: "clarithromycin-500", severity: "major", effect: "Raises carbamazepine to toxic levels." },
  { a: "tramadol-50", b: "fluoxetine-20", severity: "major", effect: "Risk of serotonin syndrome and seizures." },
  { a: "fluoxetine-20", b: "class:nsaid", severity: "moderate", effect: "Increased risk of stomach bleeding." },
  { a: "prednisolone-5", b: "class:nsaid", severity: "moderate", effect: "Increased risk of stomach ulcers and bleeding." },
  { a: "artemether-lumefantrine", b: "class:macrolide", severity: "moderate", effect: "Both can prolong the QT interval (heart rhythm)." },
  { a: "artemether-lumefantrine", b: "class:fluoroquinolone", severity: "moderate", effect: "Both can prolong the QT interval (heart rhythm)." },
  { a: "artemether-lumefantrine", b: "fluconazole-150", severity: "moderate", effect: "Both can prolong the QT interval (heart rhythm)." },
];

// Drugs = nodes, interactions = edges. Class rules expand to one edge per drug pair.
export function buildInteractionGraph(drugs = DRUGS, interactions = INTERACTIONS) {
  const graph = new Graph();
  for (const d of drugs) graph.addNode(d.id);

  const expand = (key) => (key.startsWith("class:") ? drugs.filter((d) => d.cls === key.slice(6)).map((d) => d.id) : [key]);

  for (const rule of interactions) {
    for (const a of expand(rule.a)) {
      for (const b of expand(rule.b)) graph.addEdge(a, b, { severity: rule.severity, effect: rule.effect });
    }
  }
  return graph;
}

// Built once per server process and reused
let cachedGraph = null;
export function getInteractionGraph() {
  if (!cachedGraph) cachedGraph = buildInteractionGraph();
  return cachedGraph;
}
