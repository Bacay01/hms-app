import { DRUGS, DRUG_BY_ID, buildInteractionGraph } from "@/lib/drugs";
import { buildDrugIndex, searchDrugs } from "@/lib/drugSearch";
import { calcQuantity, checkPrescription } from "@/lib/prescribing";

const graph = buildInteractionGraph();
const drug = (id) => DRUG_BY_ID.get(id);
const check = (id, currentIds = [], allergies = "") =>
  checkPrescription({ drug: drug(id), currentDrugs: currentIds.map(drug), allergies }, graph).map(
    (i) => `${i.type}:${i.severity}`
  );

describe("calcQuantity", () => {
  it("multiplies dose × times a day × days, rounding up", () => {
    expect(calcQuantity(1, "TDS", 5)).toBe(15);
    expect(calcQuantity(4, "BD", 3)).toBe(24); // artemether/lumefantrine adult course
    expect(calcQuantity(0.5, "OD", 7)).toBe(4);
    expect(calcQuantity(2, "STAT", 5)).toBe(2);
  });
});

describe("checkPrescription (Graph)", () => {
  it("finds nothing wrong with paracetamol alone", () => {
    expect(check("paracetamol-500")).toEqual([]);
  });

  it("flags warfarin + an NSAID as major (class rule expanded into edges)", () => {
    expect(check("ibuprofen-400", ["warfarin-5"])).toEqual(["interaction:major"]);
  });

  it("flags an ACE inhibitor + spironolactone as major", () => {
    expect(check("spironolactone-25", ["lisinopril-10"])).toEqual(["interaction:major"]);
  });

  it("flags ciprofloxacin + iron as moderate", () => {
    expect(check("ciprofloxacin-500", ["ferrous-sulphate-200"])).toEqual(["interaction:moderate"]);
  });

  it("blocks a penicillin for a penicillin-allergic patient", () => {
    expect(check("amoxiclav-625", [], "Penicillin")).toEqual(["allergy:major"]);
  });

  it("warns about cephalosporin cross-reactivity", () => {
    expect(check("cefuroxime-500", [], "penicillin (rash)")).toEqual(["allergy:moderate"]);
  });

  it("warns about two drugs from the same class", () => {
    expect(check("diclofenac-50", ["ibuprofen-400"])).toEqual(["duplicate:moderate"]);
  });
});

describe("searchDrugs (Trie)", () => {
  const index = buildDrugIndex(DRUGS);

  it("ranks names that start with the query first", () => {
    expect(searchDrugs(index, "para")[0].id).toBe("paracetamol-500");
  });

  it("finds by brand name", () => {
    expect(searchDrugs(index, "coartem").map((d) => d.id)).toEqual(["artemether-lumefantrine"]);
  });
});
