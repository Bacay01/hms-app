import { buildNoteHistory, changedFields } from "@/lib/noteHistory";

const n = (id, version, previousId, fields = {}) => ({ id, version, previousId, ...fields });

describe("buildNoteHistory (linked list)", () => {
  it("walks newest → oldest by following previous pointers", () => {
    const { versions, intact } = buildNoteHistory([n("a", 1, null), n("c", 3, "b"), n("b", 2, "a")]);
    expect(versions.map((v) => v.id)).toEqual(["c", "b", "a"]);
    expect(intact).toBe(true);
  });

  it("handles a visit with no note yet", () => {
    expect(buildNoteHistory([])).toEqual({ versions: [], intact: true });
  });

  it("detects a cycle with Floyd's tortoise and hare", () => {
    // d → c → b → a → c → … (a points back into the chain)
    const notes = [n("d", 4, "c"), n("c", 3, "b"), n("b", 2, "a"), n("a", 1, "c")];
    expect(buildNoteHistory(notes).intact).toBe(false);
  });

  it("flags a broken chain (missing earlier version)", () => {
    expect(buildNoteHistory([n("b", 2, "a")]).intact).toBe(false);
  });
});

describe("changedFields", () => {
  it("lists sections that differ from the previous version", () => {
    const prev = { presentingComplaint: "Fever", plan: "Rest" };
    const cur = { presentingComplaint: "Fever", plan: "Admit", examination: "Pale" };
    expect(changedFields(cur, prev)).toEqual(["examination", "plan"]);
  });

  it("treats every filled section as new on the first version", () => {
    expect(changedFields({ presentingComplaint: "Cough", plan: "Review" }, null)).toEqual(["presentingComplaint", "plan"]);
  });
});

