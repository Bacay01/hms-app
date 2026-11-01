import { DIAGNOSES } from "@/lib/diagnoses";
import { buildDiagnosisIndex, searchDiagnoses } from "@/lib/diagnosisSearch";

const index = buildDiagnosisIndex(DIAGNOSES);
const codes = (q) => searchDiagnoses(index, q).map((d) => d.code);

describe("searchDiagnoses (Trie)", () => {
  it("ranks names that start with the query first", () => {
    expect(searchDiagnoses(index, "mal")[0].name).toBe("Malaria, unspecified");
  });

  it("finds by ICD-10 code", () => {
    expect(codes("b54")[0]).toBe("B54");
  });

  it("finds by abbreviation", () => {
    expect(codes("uti")).toContain("N39.0");
    expect(codes("hbp")).toContain("I10");
  });

  it("finds by everyday Nigerian name", () => {
    expect(codes("apollo")).toEqual(["H10.9"]);
  });

  it("matches multiple words (Set intersection)", () => {
    expect(codes("typhoid fev")).toEqual(["A01.0"]);
  });

  it("returns nothing for gibberish", () => {
    expect(codes("zzzz")).toEqual([]);
  });
});
